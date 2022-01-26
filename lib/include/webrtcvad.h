#pragma once

extern "C" {
#include "webrtc/common_audio/vad/include/webrtc_vad.h"
}

namespace speechrecorder {

class WebrtcVad {
 private:
  VadInst* instance_ = nullptr;
  int level_;
  int sampleRate_;

 public:
  WebrtcVad(int level, int sampleRate);
  ~WebrtcVad();
  bool Process(int16_t* buffer, size_t size);
  void Reset();
};

}  // namespace speechrecorder
