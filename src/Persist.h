#ifndef PERSIST_H
#define PERSIST_H

#include <memory>

namespace speechrecorder {

class Persist {
 public:
  Persist(v8::Local<v8::Object> object) : mPersistObj(object) {}
  ~Persist() { mPersistObj.Reset(); }

 private:
  Nan::Persistent<v8::Object> mPersistObj;
};

}  // namespace speechrecorder

#endif
