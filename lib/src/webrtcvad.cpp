#include "microphone.h"
#include "webrtcvad.h"

namespace speechrecorder {

WebrtcVad::WebrtcVad(int level, int sampleRate)
    : level_(level), sampleRate_(sampleRate) {
  Reset();
}

WebrtcVad::~WebrtcVad() {
  if (instance_ != nullptr) {
    WebRtcVad_Free(instance_);
  }
}

bool WebrtcVad::Process(int16_t* buffer, size_t size) {
  return WebRtcVad_Process(instance_, sampleRate_, buffer, size) == 1;
}

void WebrtcVad::Reset() {
  if (instance_ != nullptr) {
    WebRtcVad_Free(instance_);
  }

  instance_ = WebRtcVad_Create();
  WebRtcVad_Init(instance_);
  WebRtcVad_set_mode(instance_, level_);
}

}  // namespace speechrecorder
