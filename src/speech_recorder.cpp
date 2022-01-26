#include <napi.h>

#include <atomic>
#include <chrono>
#include <memory>
#include <string>
#include <vector>

#include "chunk_processor.h"
#include "devices.h"
#include "portaudio.h"
#include "speech_recorder.h"

#define DR_WAV_IMPLEMENTATION
#include "dr_wav.h"

Napi::Object SpeechRecorder::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function f = DefineClass(
      env, "SpeechRecorder",
      {
          InstanceMethod<&SpeechRecorder::ProcessFile>(
              "processFile", static_cast<napi_property_attributes>(
                                 napi_writable | napi_configurable)),
          InstanceMethod<&SpeechRecorder::Start>(
              "start", static_cast<napi_property_attributes>(
                           napi_writable | napi_configurable)),
          InstanceMethod<&SpeechRecorder::Stop>(
              "stop", static_cast<napi_property_attributes>(napi_writable |
                                                            napi_configurable)),
      });

  Napi::FunctionReference* constructor = new Napi::FunctionReference();
  *constructor = Napi::Persistent(f);

  exports.Set("SpeechRecorder", f);
  env.SetInstanceData<Napi::FunctionReference>(constructor);

  exports.Set(Napi::String::New(env, "devices"),
              Napi::Function::New(env, GetDevices));
  return exports;
}

SpeechRecorder::SpeechRecorder(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<SpeechRecorder>(info),
      stopped_(true),
      queue_(),
      callback_(Napi::Persistent(info[1].As<Napi::Function>())),
      threadSafeFunctionCallback_([&](Napi::Env env, Napi::Function jsCallback,
                                      SpeechRecorderCallbackData* data) {
        Napi::Object object = Napi::Object::New(env);
        object.Set("speaking", Napi::Boolean::New(env, data->speaking));
        object.Set("volume", Napi::Number::New(env, data->volume));
        object.Set("speech", Napi::Boolean::New(env, data->speech));
        object.Set("probability", Napi::Number::New(env, data->probability));
        object.Set("consecutiveSilence",
                   Napi::Number::New(env, (double)data->consecutiveSilence));

        if (data->audio.size() > 0) {
          Napi::Int16Array buffer =
              Napi::Int16Array::New(env, data->audio.size());
          for (size_t i = 0; i < data->audio.size(); i++) {
            buffer[i] = data->audio[i];
          }

          object.Set("audio", buffer);
        }

        jsCallback.Call({Napi::String::New(env, data->event), object});
        delete data;
      }),
      modelPath_(info[0].As<Napi::String>().Utf8Value()),
      options_({
          info[2]
              .As<Napi::Object>()
              .Get("consecutiveFramesForSilence")
              .As<Napi::Number>()
              .Int32Value(),
          info[2]
              .As<Napi::Object>()
              .Get("consecutiveFramesForSpeaking")
              .As<Napi::Number>()
              .Int32Value(),
          info[2]
              .As<Napi::Object>()
              .Get("device")
              .As<Napi::Number>()
              .Int32Value(),
          info[2]
              .As<Napi::Object>()
              .Get("leadingBufferFrames")
              .As<Napi::Number>()
              .Int32Value(),
          [&](std::vector<short> audio) {
            SpeechRecorderCallbackData* data = new SpeechRecorderCallbackData();
            data->event = "chunkStart";
            data->audio = audio;
            queue_.enqueue(data);
          },
          [&](std::vector<short> audio, bool speaking, double volume,
              bool speech, double probability, int consecutiveSilence) {
            SpeechRecorderCallbackData* data = new SpeechRecorderCallbackData();
            data->event = "audio";
            data->audio = audio;
            data->speaking = speaking;
            data->volume = volume;
            data->speech = speech;
            data->probability = probability;
            data->consecutiveSilence = consecutiveSilence;
            queue_.enqueue(data);
          },
          [&]() {
            SpeechRecorderCallbackData* data = new SpeechRecorderCallbackData();
            data->event = "chunkEnd";
            queue_.enqueue(data);
          },
          info[2]
              .As<Napi::Object>()
              .Get("samplesPerFrame")
              .As<Napi::Number>()
              .Int32Value(),
          info[2]
              .As<Napi::Object>()
              .Get("sampleRate")
              .As<Napi::Number>()
              .Int32Value(),
          info[2]
              .As<Napi::Object>()
              .Get("sileroVadBufferSize")
              .As<Napi::Number>()
              .Int32Value(),
          info[2]
              .As<Napi::Object>()
              .Get("sileroVadRateLimit")
              .As<Napi::Number>()
              .Int32Value(),
          info[2]
              .As<Napi::Object>()
              .Get("sileroVadSilenceThreshold")
              .As<Napi::Number>()
              .DoubleValue(),
          info[2]
              .As<Napi::Object>()
              .Get("sileroVadSpeakingThreshold")
              .As<Napi::Number>()
              .DoubleValue(),
          info[2]
              .As<Napi::Object>()
              .Get("webrtcVadLevel")
              .As<Napi::Number>()
              .Int32Value(),
          info[2]
              .As<Napi::Object>()
              .Get("webrtcVadBufferSize")
              .As<Napi::Number>()
              .Int32Value(),
          info[2]
              .As<Napi::Object>()
              .Get("webrtcVadResultsSize")
              .As<Napi::Number>()
              .Int32Value(),
      }),
      processor_(modelPath_, options_) {}

void SpeechRecorder::ProcessFile(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::string path = info[0].As<Napi::String>().Utf8Value();

  // we don't want to create two processors on startup, because loading the
  // silero model is expensive, so lazily create this instance only if this
  // method is actually called (which is probably not common)
  if (!processFileProcessor_) {
    speechrecorder::ChunkProcessorOptions options = options_;

    options.onChunkStart = [&](std::vector<short> audio) {
      Napi::Object object = Napi::Object::New(env);
      if (audio.size() > 0) {
        Napi::Int16Array buffer = Napi::Int16Array::New(env, audio.size());
        for (size_t i = 0; i < audio.size(); i++) {
          buffer[i] = audio[i];
        }

        object.Set("audio", buffer);
      }

      callback_.Value().Call({Napi::String::New(env, "chunkStart"), object});
    };

    options.onAudio = [&](std::vector<short> audio, bool speaking,
                          double volume, bool speech, double probability,
                          int consecutiveSilence) {
      Napi::Object object = Napi::Object::New(env);
      object.Set("speaking", Napi::Boolean::New(env, speaking));
      object.Set("volume", Napi::Number::New(env, volume));
      object.Set("speech", Napi::Boolean::New(env, speech));
      object.Set("probability", Napi::Number::New(env, probability));
      object.Set("consecutiveSilence",
                 Napi::Number::New(env, (double)consecutiveSilence));

      if (audio.size() > 0) {
        Napi::Int16Array buffer = Napi::Int16Array::New(env, audio.size());
        for (size_t i = 0; i < audio.size(); i++) {
          buffer[i] = audio[i];
        }

        object.Set("audio", buffer);
        callback_.Value().Call({Napi::String::New(env, "audio"), object});
      }
    };

    options.onChunkEnd = [&] {
      callback_.Value().Call({Napi::String::New(env, "chunkEnd")});
    };

    processFileProcessor_ =
        std::make_unique<speechrecorder::ChunkProcessor>(modelPath_, options);
  }

  unsigned int channels;
  unsigned int sampleRate;
  drwav_uint64 frames;
  short* data = drwav_open_file_and_read_pcm_frames_s16(
      path.c_str(), &channels, &sampleRate, &frames, nullptr);

  processFileProcessor_->Reset();
  int size = (int)frames;
  for (int i = 0; i < size; i += options_.samplesPerFrame) {
    std::vector<short> buffer;
    for (int j = 0; j < options_.samplesPerFrame; j++) {
      if (i + j < size) {
        buffer.push_back(data[i + j]);
      }
    }

    if (buffer.size() == (size_t)options_.samplesPerFrame) {
      processFileProcessor_->Process(buffer.data());
    }
  }

  drwav_free(data, nullptr);
}

void SpeechRecorder::Start(const Napi::CallbackInfo& info) {
  stopped_ = false;
  threadSafeFunction_ = Napi::ThreadSafeFunction::New(
      info.Env(), callback_.Value(), "Speech Recorder Start", 0, 1,
      [&](Napi::Env env) {
        thread_.join();
      });

  thread_ = std::thread([&] {
    while (!stopped_) {
      SpeechRecorderCallbackData* data;
      bool element = queue_.try_dequeue(data);
      if (element) {
        threadSafeFunction_.BlockingCall(data, threadSafeFunctionCallback_);
      }

      std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }

    threadSafeFunction_.Release();
  });

  processor_.Start();
}

void SpeechRecorder::Stop(const Napi::CallbackInfo& info) {
  stopped_ = true;
  processor_.Stop();
}

Napi::Value GetDevices(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  std::vector<speechrecorder::Device> devices = speechrecorder::GetDevices();
  Napi::Array result = Napi::Array::New(env, devices.size());
  for (size_t i = 0; i < devices.size(); i++) {
    Napi::Object e = Napi::Object::New(env);
    e.Set("id", devices[i].id);
    e.Set("name", devices[i].name);
    e.Set("apiName", devices[i].apiName);
    e.Set("maxInputChannels", devices[i].maxInputChannels);
    e.Set("maxOutputChannels", devices[i].maxOutputChannels);
    e.Set("defaultSampleRate", devices[i].defaultSampleRate);
    e.Set("isDefaultInput", devices[i].isDefaultInput);
    e.Set("isDefaultOutput", devices[i].isDefaultOutput);
    result[i] = e;
  }

  return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  SpeechRecorder::Init(env, exports);
  return exports;
}

NODE_API_MODULE(addon, Init);
