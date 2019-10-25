#include <nan.h>
#include <portaudio.h>
#include <condition_variable>
#include <map>
#include <mutex>
#include "AudioIn.h"
#include "ChunkQueue.h"
#include "Params.h"
#include "Persist.h"
#include "common.h"

using namespace v8;

namespace speechrecorder {

extern bool DEBUG;

static std::map<char *, std::shared_ptr<Memory> > outstandingAllocs;
static void freeAllocCb(char *data, void *hint) {
  std::map<char *, std::shared_ptr<Memory> >::iterator it =
      outstandingAllocs.find(data);
  if (it != outstandingAllocs.end()) {
    outstandingAllocs.erase(it);
  }
}

class InContext {
 public:
  InContext(std::shared_ptr<AudioOptions> audioOptions, PaStreamCallback *cb)
      : mActive(true),
        mAudioOptions(audioOptions),
        mChunkQueue(mAudioOptions->maxQueue()) {
    // Set DEBUG flag based on audio options
    DEBUG = audioOptions->debugMode();

    PaError errCode = Pa_Initialize();
    if (errCode != paNoError) {
      std::string err = std::string("Could not initialize PortAudio: ") +
                        Pa_GetErrorText(errCode);
      Nan::ThrowError(err.c_str());
    }

    DEBUG_PRINT_ERR("Input %s\n", mAudioOptions->toString().c_str());

    PaStreamParameters inParams;
    memset(&inParams, 0, sizeof(PaStreamParameters));

    int32_t deviceID = (int32_t)mAudioOptions->deviceID();
    if ((deviceID >= 0) && (deviceID < Pa_GetDeviceCount())) {
      inParams.device = (PaDeviceIndex)deviceID;
    } else {
      inParams.device = Pa_GetDefaultInputDevice();
    }

    if (inParams.device == paNoDevice) {
      Nan::ThrowError("No default input device");
    }

    DEBUG_PRINT_ERR("Input device name is %s\n",
                    Pa_GetDeviceInfo(inParams.device)->name);

    inParams.channelCount = mAudioOptions->channelCount();
    if (inParams.channelCount >
        Pa_GetDeviceInfo(inParams.device)->maxInputChannels) {
      Nan::ThrowError(
          "Channel count exceeds maximum number of input channels for device");
    }

    uint32_t sampleFormat = mAudioOptions->sampleFormat();
    switch (sampleFormat) {
      case 8:
        inParams.sampleFormat = paInt8;
        break;
      case 16:
        inParams.sampleFormat = paInt16;
        break;
      case 24:
        inParams.sampleFormat = paInt24;
        break;
      case 32:
        inParams.sampleFormat = paInt32;
        break;
      default:
        Nan::ThrowError("Invalid sampleFormat");
    }

    inParams.suggestedLatency =
        Pa_GetDeviceInfo(inParams.device)->defaultLowInputLatency;
    inParams.hostApiSpecificStreamInfo = NULL;

    double sampleRate = (double)mAudioOptions->sampleRate();
    uint32_t framesPerBuffer = mAudioOptions->framesPerBuffer();
    if (framesPerBuffer == 0) {
      framesPerBuffer = paFramesPerBufferUnspecified;
    }

#ifdef __arm__
    framesPerBuffer = 256;
    inParams.suggestedLatency =
        Pa_GetDeviceInfo(inParams.device)->defaultHighInputLatency;
#endif

    errCode = Pa_OpenStream(&mStream, &inParams, NULL, sampleRate,
                            framesPerBuffer, paNoFlag, cb, this);
    if (errCode != paNoError) {
      std::string err =
          std::string("Could not open stream: ") + Pa_GetErrorText(errCode);
      Nan::ThrowError(err.c_str());
    }
  }

  ~InContext() {
    Pa_StopStream(mStream);
    Pa_Terminate();
  }

  void start() {
    PaError errCode = Pa_StartStream(mStream);
    if (errCode != paNoError) {
      std::string err = std::string("Could not start input stream: ") +
                        Pa_GetErrorText(errCode);
      return Nan::ThrowError(err.c_str());
    }
  }

  void stop() {
    Pa_StopStream(mStream);
    Pa_Terminate();
  }

  void abort() {
    Pa_AbortStream(mStream);
    Pa_Terminate();
  }

  std::shared_ptr<Memory> readChunk() { return mChunkQueue.dequeue(); }

  bool readBuffer(const void *srcBuf, uint32_t frameCount) {
    const uint8_t *src = (uint8_t *)srcBuf;
    uint32_t bytesAvailable = frameCount * mAudioOptions->channelCount() *
                              mAudioOptions->sampleFormat() / 8;
    std::shared_ptr<Memory> dstBuf = Memory::makeNew(bytesAvailable);
    memcpy(dstBuf->buf(), src, bytesAvailable);
    mChunkQueue.enqueue(dstBuf);
    return mActive;
  }

  void checkStatus(uint32_t statusFlags) {
    if (statusFlags) {
      std::string err = std::string("portAudio status - ");
      if (statusFlags & paInputUnderflow) {
        err += "input underflow ";
      }
      if (statusFlags & paInputOverflow) {
        err += "input overflow ";
      }

      std::lock_guard<std::mutex> lk(m);
      mErrStr = err;
    }
  }

  bool getErrStr(std::string &errStr) {
    std::lock_guard<std::mutex> lk(m);
    errStr = mErrStr;
    mErrStr = std::string();
    return errStr != std::string();
  }

  void quit() {
    std::unique_lock<std::mutex> lk(m);
    mActive = false;
    mChunkQueue.quit();
  }

 private:
  bool mActive;
  std::shared_ptr<AudioOptions> mAudioOptions;
  ChunkQueue<std::shared_ptr<Memory> > mChunkQueue;
  PaStream *mStream;
  std::string mErrStr;
  mutable std::mutex m;
  std::condition_variable cv;
};

int InCallback(const void *input, void *output, unsigned long frameCount,
               const PaStreamCallbackTimeInfo *timeInfo,
               PaStreamCallbackFlags statusFlags, void *userData) {
  InContext *context = (InContext *)userData;
  context->checkStatus(statusFlags);
  return context->readBuffer(input, frameCount) ? paContinue : paComplete;
}

class InWorker : public Nan::AsyncWorker {
 public:
  InWorker(std::shared_ptr<InContext> InContext, Nan::Callback *callback)
      : AsyncWorker(callback), mInContext(InContext) {}
  ~InWorker() {}

  void Execute() { mInChunk = mInContext->readChunk(); }

  void HandleOKCallback() {
    Nan::HandleScope scope;

    std::string errStr;
    if (mInContext->getErrStr(errStr)) {
      Local<Value> argv[] = {Nan::Error(errStr.c_str())};
      callback->Call(1, argv, async_resource);
    }

    if (mInChunk) {
      outstandingAllocs.insert(make_pair((char *)mInChunk->buf(), mInChunk));
      Nan::MaybeLocal<Object> maybeBuf = Nan::NewBuffer(
          (char *)mInChunk->buf(), mInChunk->numBytes(), freeAllocCb, 0);
      Local<Value> argv[] = {Nan::Null(), maybeBuf.ToLocalChecked()};
      callback->Call(2, argv, async_resource);
    } else {
      Local<Value> argv[] = {Nan::Null(), Nan::Null()};
      callback->Call(2, argv, async_resource);
    }
  }

 private:
  std::shared_ptr<InContext> mInContext;
  std::shared_ptr<Memory> mInChunk;
};

class QuitInWorker : public Nan::AsyncWorker {
 public:
  QuitInWorker(std::shared_ptr<InContext> InContext, Nan::Callback *callback)
      : AsyncWorker(callback), mInContext(InContext) {}
  ~QuitInWorker() {}

  void Execute() { mInContext->quit(); }

  void HandleOKCallback() {
    Nan::HandleScope scope;
    mInContext->stop();
    callback->Call(0, NULL, async_resource);
  }

 private:
  std::shared_ptr<InContext> mInContext;
};

AudioIn::AudioIn(Local<Object> options) {
  mInContext = std::make_shared<InContext>(
      std::make_shared<AudioOptions>(options), InCallback);
}

AudioIn::~AudioIn() {}

void AudioIn::doStart() { mInContext->start(); }

NAN_METHOD(AudioIn::Start) {
  AudioIn *obj = Nan::ObjectWrap::Unwrap<AudioIn>(info.Holder());
  obj->doStart();
  info.GetReturnValue().SetUndefined();
}

NAN_METHOD(AudioIn::Abort) {
  AudioIn *obj = Nan::ObjectWrap::Unwrap<AudioIn>(info.Holder());
  obj->mInContext->abort();
  info.GetReturnValue().SetUndefined();
}

NAN_METHOD(AudioIn::Read) {
  if (info.Length() != 2) {
    return Nan::ThrowError("AudioIn Read expects 2 arguments");
  }
  if (!info[0]->IsNumber()) {
    return Nan::ThrowError(
        "AudioIn Read requires a valid advisory size as the first parameter");
  }
  if (!info[1]->IsFunction()) {
    return Nan::ThrowError(
        "AudioIn Read requires a valid callback as the second parameter");
  }

  // uint32_t sizeAdv = Nan::To<uint32_t>(info[0]).FromJust();
  Local<Function> callback = Local<Function>::Cast(info[1]);
  AudioIn *obj = Nan::ObjectWrap::Unwrap<AudioIn>(info.Holder());

  AsyncQueueWorker(
      new InWorker(obj->getContext(), new Nan::Callback(callback)));
  info.GetReturnValue().SetUndefined();
}

NAN_METHOD(AudioIn::Quit) {
  if (info.Length() != 1) {
    return Nan::ThrowError("AudioIn Quit expects 1 argument");
  }
  if (!info[0]->IsFunction()) {
    return Nan::ThrowError(
        "AudioIn Quit requires a valid callback as the parameter");
  }

  Local<Function> callback = Local<Function>::Cast(info[0]);
  AudioIn *obj = Nan::ObjectWrap::Unwrap<AudioIn>(info.Holder());

  AsyncQueueWorker(
      new QuitInWorker(obj->getContext(), new Nan::Callback(callback)));
  info.GetReturnValue().SetUndefined();
}

NAN_MODULE_INIT(AudioIn::Init) {
  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
  tpl->SetClassName(Nan::New("AudioIn").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  SetPrototypeMethod(tpl, "start", Start);
  SetPrototypeMethod(tpl, "read", Read);
  SetPrototypeMethod(tpl, "quit", Quit);
  SetPrototypeMethod(tpl, "abort", Abort);

  constructor().Reset(Nan::GetFunction(tpl).ToLocalChecked());
  Nan::Set(target, Nan::New("AudioIn").ToLocalChecked(),
           Nan::GetFunction(tpl).ToLocalChecked());
}

}  // namespace speechrecorder
