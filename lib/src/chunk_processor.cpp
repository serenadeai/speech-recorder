#include <algorithm>
#include <chrono>
#include <climits>
#include <cmath>
#include <iostream>
#include <memory>

#include "chunk_processor.h"

namespace speechrecorder {

static std::unique_ptr<Ort::Env> ortEnv_;
static std::unique_ptr<Ort::MemoryInfo> ortMemory_;
static std::unique_ptr<Ort::Session> ortSession_;

ChunkProcessor::ChunkProcessor(
    std::string modelPath, int device, int sampleRate, int samplesPerFrame,
    int webrtcVadLevel, std::function<void(std::vector<short>)> onChunkStart,
    std::function<void(std::vector<short>, bool, double, bool, double, int)>
        onAudio,
    std::function<void()> onChunkEnd, ChunkProcessorOptions options)
    : samplesPerFrame_(samplesPerFrame),
      onChunkStart_(onChunkStart),
      onAudio_(onAudio),
      onChunkEnd_(onChunkEnd),
      options_(options),
      queue_(),
      stopped_(false),
      microphone_(device, samplesPerFrame, sampleRate, &queue_),
      webrtcVad_(webrtcVadLevel, sampleRate) {
  if (!ortSession_) {
    ortEnv_ = std::make_unique<Ort::Env>(ORT_LOGGING_LEVEL_WARNING,
                                         "SpeechRecorder::ChunkProcessor");
    ortMemory_ = std::make_unique<Ort::MemoryInfo>(Ort::MemoryInfo::CreateCpu(
        OrtAllocatorType::OrtArenaAllocator, OrtMemType::OrtMemTypeDefault));

    Ort::SessionOptions sessionOptions;
    sessionOptions.SetIntraOpNumThreads(1);
#ifdef _WIN32
    std::wstring wstring(modelPath.begin(), modelPath.end());
    ortSession_ = std::make_unique<Ort::Session>(*ortEnv_, wstring.c_str(),
                                                 sessionOptions);

#else
    ortSession_ = std::make_unique<Ort::Session>(*ortEnv_, modelPath.c_str(),
                                                 sessionOptions);
#endif
  }
}

void ChunkProcessor::Process(short* input) {
  std::vector<short> frame;
  const short* iterator = (const short*)input;
  unsigned long long sum = 0;
  for (unsigned long i = 0; i < samplesPerFrame_; i++) {
    const short value = *iterator++;
    frame.push_back(value);
    leadingBuffer_.push_back(value);
    sileroVadBuffer_.push_back((float)value / (float)SHRT_MAX);
    webrtcVadBuffer_.push_back(value);
    sum += value * value;
  }

  double volume = sqrt((double)sum / (double)samplesPerFrame_);
  if (leadingBuffer_.size() > options_.leadingBufferFrames * samplesPerFrame_) {
    leadingBuffer_.erase(
        leadingBuffer_.begin(),
        leadingBuffer_.begin() +
            (leadingBuffer_.size() -
             (options_.leadingBufferFrames * samplesPerFrame_)));
  }

  // typically, the number of samples per frame will be larger than the
  // webrtcvad buffer size, so continually append the new audio to the end of
  // the buffer, and process the buffer from left to right until it's too small
  // for a webrtcvad call
  while (webrtcVadBuffer_.size() >= options_.webrtcVadBufferSize) {
    std::vector<short> buffer(
        webrtcVadBuffer_.begin(),
        webrtcVadBuffer_.begin() + options_.webrtcVadBufferSize);
    webrtcVadResults_.push_back(
        webrtcVad_.Process(buffer.data(), options_.webrtcVadBufferSize));
    webrtcVadBuffer_.erase(
        webrtcVadBuffer_.begin(),
        webrtcVadBuffer_.begin() + options_.webrtcVadBufferSize);
  }

  if (webrtcVadResults_.size() > options_.webrtcVadResultsSize) {
    webrtcVadResults_.erase(
        webrtcVadResults_.begin(),
        webrtcVadResults_.begin() +
            (webrtcVadResults_.size() - options_.webrtcVadResultsSize));
  }

  // if we're speaking or any past webrtcvad result within the window is true,
  // then use the result from the silero vad
  double probability = 0.0;
  if (speaking_ || webrtcVadResults_.size() != options_.webrtcVadResultsSize ||
      std::any_of(webrtcVadResults_.begin(), webrtcVadResults_.end(),
                  [](bool e) { return e; })) {
    while (sileroVadBuffer_.size() >= options_.sileroVadBufferSize) {
      std::vector<int64_t> inputDimensions;
      inputDimensions.push_back(1);
      inputDimensions.push_back(sileroVadBuffer_.size());

      std::vector<Ort::Value> inputTensors;
      inputTensors.push_back(Ort::Value::CreateTensor<float>(
          *ortMemory_, sileroVadBuffer_.data(), sileroVadBuffer_.size(),
          inputDimensions.data(), inputDimensions.size()));

      std::vector<float> outputTensorValues(2);
      std::vector<int64_t> outputDimensions;
      outputDimensions.push_back(1);
      outputDimensions.push_back(2);

      std::vector<Ort::Value> outputTensors;
      outputTensors.push_back(Ort::Value::CreateTensor<float>(
          *ortMemory_, outputTensorValues.data(), outputTensorValues.size(),
          outputDimensions.data(), outputDimensions.size()));

      std::vector<const char*> inputNames{"input"};
      std::vector<const char*> outputNames{"output"};
      ortSession_->Run(Ort::RunOptions{nullptr}, inputNames.data(),
                       inputTensors.data(), 1, outputNames.data(),
                       outputTensors.data(), 1);

      sileroVadProbability_ = outputTensorValues[1];
      if (sileroVadBuffer_.size() > options_.sileroVadBufferSize) {
        sileroVadBuffer_.erase(
            sileroVadBuffer_.begin(),
            sileroVadBuffer_.begin() + options_.sileroVadBufferSize);
      }
    }

    probability = sileroVadProbability_;
  }

  bool speaking = speaking_ ? probability > options_.sileroVadSilenceThreshold
                            : probability > options_.sileroVadSpeakingThreshold;
  if (speaking) {
    consecutiveSilence_ = 0;
    consecutiveSpeaking_++;
  } else {
    consecutiveSilence_++;
    consecutiveSpeaking_ = 0;
  }

  if (!speaking_ &&
      consecutiveSpeaking_ == options_.consecutiveFramesForSpeaking) {
    speaking_ = true;
    if (onChunkStart_ != nullptr) {
      onChunkStart_(leadingBuffer_);
    }
  }

  if (onAudio_ != nullptr) {
    onAudio_(frame, speaking_, volume, speaking, probability,
             consecutiveSilence_);
  }

  if (speaking_ &&
      consecutiveSilence_ == options_.consecutiveFramesForSilence) {
    speaking_ = false;
    leadingBuffer_.clear();
    if (onChunkEnd_ != nullptr) {
      onChunkEnd_();
    }
  }
}

void ChunkProcessor::Reset() {
  consecutiveSilence_ = 0;
  consecutiveSpeaking_ = 0;
  leadingBuffer_.clear();
  speaking_ = false;
  webrtcVad_.Reset();
  webrtcVadBuffer_.clear();
  webrtcVadResults_.clear();
  short* audio;
  while (queue_.try_dequeue(audio)) {
  }
}

void ChunkProcessor::Start() {
  Reset();

  stopped_ = false;
  microphone_.Start();
  thread_ = std::thread([&] {
    while (!stopped_) {
      short* audio;
      bool element = queue_.try_dequeue(audio);
      if (element) {
        Process(audio);
      }

      std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
  });
}

void ChunkProcessor::Stop() {
  stopped_ = true;
  microphone_.Stop();

  if (thread_.joinable()) {
    thread_.join();
  }
}

}  // namespace speechrecorder
