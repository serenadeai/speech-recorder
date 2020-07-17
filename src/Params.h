#ifndef PARAMS_H
#define PARAMS_H

#include <nan.h>
#include <sstream>

using namespace v8;

namespace speechrecorder {

class Params {
 protected:
  Params() {}
  virtual ~Params() {}

  Local<Value> getKey(Local<Object> tags, const std::string& key) {
    Local<Value> val = Nan::Null();
    Local<String> keyStr = Nan::New<String>(key).ToLocalChecked();
    if (Nan::Has(tags, keyStr).FromJust())
      val = Nan::Get(tags, keyStr).ToLocalChecked();
    return val;
  }

  std::string unpackValue(Local<Value> val) {
    Local<Array> valueArray = Local<Array>::Cast(val);
    return *Nan::Utf8String(Nan::Get(valueArray, 0).ToLocalChecked());
  }

  bool unpackBool(Local<Object> tags, const std::string& key, bool dflt) {
    bool result = dflt;
    Local<Value> val = getKey(tags, key);
    if (Nan::Null() != val) result = Nan::To<bool>(val).FromJust();
    return result;
  }

  uint32_t unpackNum(Local<Object> tags, const std::string& key,
                     uint32_t dflt) {
    uint32_t result = dflt;
    Local<Value> val = getKey(tags, key);
    if (Nan::Null() != val) {
      result = Nan::To<uint32_t>(val).FromJust();
    }

    return result;
  }

  std::string unpackStr(Local<Object> tags, const std::string& key,
                        std::string dflt) {
    std::string result = dflt;
    Local<Value> val = getKey(tags, key);
    if (Nan::Null() != val) {
      result = *Nan::Utf8String(val);
    }

    return result;
  }

 private:
  Params(const Params&);
};

class AudioOptions : public Params {
 public:
  AudioOptions(Local<Object> tags)
      : mDeviceID(unpackNum(tags, "deviceId", 0xffffffff)),
        mSampleRate(unpackNum(tags, "sampleRate", 44100)),
        mChannelCount(unpackNum(tags, "channelCount", 2)),
        mSampleFormat(unpackNum(tags, "sampleFormat", 8)),
        mMaxQueue(unpackNum(tags, "maxQueue", 2)),
        mFramesPerBuffer(unpackNum(tags, "framesPerBuffer", 0)),
        mDebugMode(unpackBool(tags, "debug", false)) {}
  ~AudioOptions() {}

  uint32_t deviceID() const { return mDeviceID; }
  uint32_t sampleRate() const { return mSampleRate; }
  uint32_t channelCount() const { return mChannelCount; }
  uint32_t sampleFormat() const { return mSampleFormat; }
  uint32_t maxQueue() const { return mMaxQueue; }
  uint32_t framesPerBuffer() const { return mFramesPerBuffer; }
  bool debugMode() const { return mDebugMode; }

  std::string toString() const {
    std::stringstream ss;
    ss << "audio options: ";
    if (mDeviceID == 0xffffffff) {
      ss << "default device, ";
    } else {
      ss << "device " << mDeviceID << ", ";
    }
    ss << "sample rate " << mSampleRate << ", ";
    ss << "channels " << mChannelCount << ", ";
    ss << "bits per sample " << mSampleFormat << ", ";
    ss << "max queue " << mMaxQueue;
    ss << "framesPerBuffer " << mFramesPerBuffer;
    return ss.str();
  }

 private:
  uint32_t mDeviceID;
  uint32_t mSampleRate;
  uint32_t mChannelCount;
  uint32_t mSampleFormat;
  uint32_t mMaxQueue;
  uint32_t mFramesPerBuffer;
  bool mDebugMode;
};

}  // namespace speechrecorder

#endif
