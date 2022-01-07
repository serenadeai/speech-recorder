#include <portaudio.h>

#include <cstring>
#include <functional>
#include <iostream>
#include <vector>

#include "microphone.h"
#include "webrtcvad.h"

using namespace moodycamel;

namespace speechrecorder {

int callback(const void* input, void* output, unsigned long samplesPerFrame,
             const PaStreamCallbackTimeInfo* timeInfo,
             PaStreamCallbackFlags statusFlags, void* callbackData) {
  if (input == nullptr || callbackData == nullptr) {
    return paContinue;
  }

  MicrophoneCallbackData* data = (MicrophoneCallbackData*)callbackData;
  short* audio = (short*)input;
  for (int i = 0; i < samplesPerFrame; i++) {
    data->buffer->at((data->bufferIndex + i) % data->buffer->size()) = audio[i];
  }

  data->queue->enqueue(data->buffer->data() + data->bufferIndex);
  data->bufferIndex =
      (data->bufferIndex + samplesPerFrame) % data->buffer->size();
  return paContinue;
}

Microphone::Microphone(int device, int samplesPerFrame, int sampleRate,
                       BlockingReaderWriterQueue<short*>* queue)
    : device_(device),
      samplesPerFrame_(samplesPerFrame),
      sampleRate_(sampleRate) {
  for (int i = 0; i < samplesPerFrame * 10; i++) {
    buffer_.push_back(0);
  }

  callbackData_ = {&buffer_, 0, queue};
  PaError error = Pa_Initialize();
  if (error != paNoError) {
    HandleError(error, "Initialize");
  }

  if (device_ == -1) {
    device_ = Pa_GetDefaultInputDevice();
  }
}

void Microphone::HandleError(PaError error, const std::string& message) {
  Pa_Terminate();
  std::cerr << "PortAudio Error: " << message << std::endl
            << "Error number: " << error << std::endl
            << "Error message: " << Pa_GetErrorText(error) << std::endl;
  exit(error);
}

void Microphone::Start() {
  PaError error = paNoError;
  PaStreamParameters parameters;
  parameters.channelCount = 1;
  parameters.sampleFormat = paInt16;
  parameters.device = device_;
  parameters.suggestedLatency =
      Pa_GetDeviceInfo(parameters.device)->defaultLowInputLatency;
  parameters.hostApiSpecificStreamInfo = 0;

  error = Pa_OpenStream(&stream_, &parameters, 0, sampleRate_, samplesPerFrame_,
                        paClipOff, callback, &callbackData_);
  if (error != paNoError) {
    HandleError(error, "Open Stream");
  }

  Pa_StartStream(stream_);
  if (error != paNoError) {
    HandleError(error, "Start Stream");
  }
}

void Microphone::Stop() {
  Pa_AbortStream(stream_);
  Pa_CloseStream(stream_);
}

}  // namespace speechrecorder
