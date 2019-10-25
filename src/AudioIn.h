#ifndef AUDIOIN_H
#define AUDIOIN_H

#include "Memory.h"

namespace speechrecorder {

class InContext;

class AudioIn : public Nan::ObjectWrap {
 public:
  static NAN_MODULE_INIT(Init);

  std::shared_ptr<InContext> getContext() const { return mInContext; }
  void doStart();

 private:
  explicit AudioIn(v8::Local<v8::Object> options);
  ~AudioIn();

  static NAN_METHOD(New) {
    if (info.IsConstructCall()) {
      if (!((info.Length() == 1) && (info[0]->IsObject())))
        return Nan::ThrowError(
            "AudioIn constructor requires a valid options object as the "
            "parameter");
      v8::Local<v8::Object> options = v8::Local<v8::Object>::Cast(info[0]);
      AudioIn *obj = new AudioIn(options);
      obj->Wrap(info.This());
      info.GetReturnValue().Set(info.This());
    } else {
      const int argc = 1;
      v8::Local<v8::Value> argv[] = {info[0]};
      v8::Local<v8::Function> cons = Nan::New(constructor());
      info.GetReturnValue().Set(
          cons->NewInstance(Nan::GetCurrentContext(), argc, argv)
              .ToLocalChecked());
    }
  }

  static inline Nan::Persistent<v8::Function> &constructor() {
    static Nan::Persistent<v8::Function> my_constructor;
    return my_constructor;
  }

  static NAN_METHOD(Start);
  static NAN_METHOD(Read);
  static NAN_METHOD(Quit);
  static NAN_METHOD(Abort);

  std::shared_ptr<InContext> mInContext;
};

}  // namespace speechrecorder

#endif
