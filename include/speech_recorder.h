#pragma once

#include <napi.h>

#include <atomic>
#include <functional>
#include <thread>

#include "aligned.h"
#include "chunk_processor.h"

struct SpeechRecorderCallbackData {
  std::string event = "";
  std::vector<short> audio;
  bool speaking = false;
  double volume = 0.0;
  bool speech = false;
  double probability = 0.0;
  int consecutiveSilence = 0;
};

class SpeechRecorder : public Napi::ObjectWrap<SpeechRecorder> {
 private:
  std::atomic<bool> stopped_;
  BlockingReaderWriterQueue<SpeechRecorderCallbackData*> queue_;
  Napi::FunctionReference callback_;
  std::function<void(Napi::Env, Napi::Function, SpeechRecorderCallbackData*)>
      threadSafeFunctionCallback_;
  std::string modelPath_;
  int device_ = -1;
  int sampleRate_ = 16000;
  int samplesPerFrame_ = 480;
  int webrtcVadLevel_ = 3;
  speechrecorder::ChunkProcessorOptions options_;
  speechrecorder::ChunkProcessor processor_;
  std::thread thread_;
  Napi::ThreadSafeFunction threadSafeFunction_;
  std::unique_ptr<speechrecorder::ChunkProcessor> processFileProcessor_;

  void ProcessFile(const Napi::CallbackInfo& info);
  void SetOptions(const Napi::CallbackInfo& info);
  void Start(const Napi::CallbackInfo& info);
  void Stop(const Napi::CallbackInfo& info);

 public:
  SpeechRecorder(const Napi::CallbackInfo& info);
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

  ALIGNED
};

Napi::Value GetDevices(const Napi::CallbackInfo& info);
Napi::Object Init(Napi::Env env, Napi::Object exports);
