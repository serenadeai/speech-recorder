#include <nan.h>
#include "GetDevices.h"
// #include <node_buffer.h>
// #include <cstring>
#include <portaudio.h>

namespace speechrecorder {

NAN_METHOD(GetDevices) {
  uint32_t numDevices;

  PaError errCode = Pa_Initialize();
  if (errCode != paNoError) {
    std::string err = std::string("Could not initialize PortAudio: ") +
                      Pa_GetErrorText(errCode);
    Nan::ThrowError(err.c_str());
  }

  numDevices = Pa_GetDeviceCount();
  v8::Local<v8::Array> result = Nan::New<v8::Array>(numDevices);

  for (uint32_t i = 0; i < numDevices; ++i) {
    const PaDeviceInfo* deviceInfo = Pa_GetDeviceInfo(i);
    v8::Local<v8::Object> v8DeviceInfo = Nan::New<v8::Object>();
    Nan::Set(v8DeviceInfo, Nan::New("id").ToLocalChecked(), Nan::New(i));
    Nan::Set(v8DeviceInfo, Nan::New("name").ToLocalChecked(),
             Nan::New(deviceInfo->name).ToLocalChecked());
    Nan::Set(v8DeviceInfo, Nan::New("maxInputChannels").ToLocalChecked(),
             Nan::New(deviceInfo->maxInputChannels));
    Nan::Set(v8DeviceInfo, Nan::New("maxOutputChannels").ToLocalChecked(),
             Nan::New(deviceInfo->maxOutputChannels));
    Nan::Set(v8DeviceInfo, Nan::New("defaultSampleRate").ToLocalChecked(),
             Nan::New(deviceInfo->defaultSampleRate));
    Nan::Set(v8DeviceInfo, Nan::New("defaultLowInputLatency").ToLocalChecked(),
             Nan::New(deviceInfo->defaultLowInputLatency));
    Nan::Set(v8DeviceInfo, Nan::New("defaultLowOutputLatency").ToLocalChecked(),
             Nan::New(deviceInfo->defaultLowOutputLatency));
    Nan::Set(v8DeviceInfo, Nan::New("defaultHighInputLatency").ToLocalChecked(),
             Nan::New(deviceInfo->defaultHighInputLatency));
    Nan::Set(v8DeviceInfo,
             Nan::New("defaultHighOutputLatency").ToLocalChecked(),
             Nan::New(deviceInfo->defaultHighOutputLatency));
    Nan::Set(v8DeviceInfo, Nan::New("hostAPIName").ToLocalChecked(),
             Nan::New(Pa_GetHostApiInfo(deviceInfo->hostApi)->name)
                 .ToLocalChecked());

    Nan::Set(result, i, v8DeviceInfo);
  }

  Pa_Terminate();
  info.GetReturnValue().Set(result);
}

}  // namespace speechrecorder
