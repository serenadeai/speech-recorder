#pragma once

#include <portaudio.h>
#include <readerwriterqueue.h>

#include <functional>
#include <string>
#include <vector>

#include "webrtcvad.h"

using namespace moodycamel;

namespace speechrecorder {

struct MicrophoneCallbackData {
  std::vector<short>* buffer;
  int bufferIndex = 0;
  BlockingReaderWriterQueue<short*>* queue;
};

class Microphone {
 private:
  std::vector<short> buffer_;
  MicrophoneCallbackData callbackData_;
  int device_;
  int samplesPerFrame_;
  int sampleRate_;
  PaStream* stream_;

  void HandleError(PaError error, const std::string& message);

 public:
  Microphone(int device, int samplesPerFrame, int sampleRate,
             BlockingReaderWriterQueue<short*>* queue);
  void Start();
  void Stop();
};

}  // namespace speechrecorder
