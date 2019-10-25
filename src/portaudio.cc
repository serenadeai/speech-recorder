#include <nan.h>
#include "AudioIn.h"
#include "GetDevices.h"

NAN_MODULE_INIT(Init) {
  Nan::Set(target, Nan::New("getDevices").ToLocalChecked(),
           Nan::GetFunction(
               Nan::New<v8::FunctionTemplate>(speechrecorder::GetDevices))
               .ToLocalChecked());

  speechrecorder::AudioIn::Init(target);
}

NODE_MODULE(portAudio, Init);
