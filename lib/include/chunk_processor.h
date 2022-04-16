#pragma once

#include <readerwriterqueue.h>

#include <atomic>
#include <string>
#include <thread>
#include <vector>

#include "aligned.h"
#include "microphone.h"
#include "onnxruntime_cxx_api.h"
#include "webrtcvad.h"

namespace speechrecorder {

struct ChunkProcessorOptions {
  int consecutiveFramesForSilence = 5;
  int consecutiveFramesForSpeaking = 1;
  int leadingBufferFrames = 10;
  int sileroVadBufferSize = 480;
  double sileroVadSilenceThreshold = 0.3;
  double sileroVadSpeakingThreshold = 0.3;
  int webrtcVadBufferSize = 480;
  int webrtcVadResultsSize = 10;
};

class ChunkProcessor {
 private:
  std::vector<short> leadingBuffer_;
  int consecutiveSilence_ = 0;
  int consecutiveSpeaking_ = 0;
  int framesUntilSileroVad_ = 0;
  Microphone microphone_;
  std::function<void(std::vector<short>)> onChunkStart_;
  std::function<void(std::vector<short>, bool, double, bool, double, int)>
      onAudio_;
  std::function<void()> onChunkEnd_;
  BlockingReaderWriterQueue<short*> queue_;
  int samplesPerFrame_ = 480;
  std::vector<float> sileroVadBuffer_;
  double sileroVadProbability_ = 0.0;
  bool speaking_ = false;
  std::atomic<bool> stopped_;
  std::thread thread_;
  WebrtcVad webrtcVad_;
  std::vector<short> webrtcVadBuffer_;
  std::vector<bool> webrtcVadResults_;

 public:
  ChunkProcessorOptions options_;
  ChunkProcessor(
      std::string modelPath, int device, int sampleRate, int samplesPerFrame,
      int webrtcVadLevel, std::function<void(std::vector<short>)> onChunkStart,
      std::function<void(std::vector<short>, bool, double, bool, double, int)>
          onAudio,
      std::function<void()> onChunkEnd, ChunkProcessorOptions options);
  void Process(short* audio);
  void Reset();
  void Start();
  void Stop();

  ALIGNED
};

}  // namespace speechrecorder
