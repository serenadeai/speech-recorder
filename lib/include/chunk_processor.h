#pragma once

#include <readerwriterqueue.h>

#include <atomic>
#include <mutex>
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
  int device = -1;
  int leadingBufferFrames = 10;
  std::function<void(std::vector<short>)> onChunkStart = nullptr;
  std::function<void(std::vector<short>, bool, double, bool, double, int)>
      onAudio = nullptr;
  std::function<void()> onChunkEnd = nullptr;
  int samplesPerFrame = 480;
  int sampleRate = 16000;
  int sileroVadBufferSize = 2000;
  int sileroVadRateLimit = 3;
  double sileroVadSilenceThreshold = 0.1;
  double sileroVadSpeakingThreshold = 0.3;
  int webrtcVadLevel = 3;
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
  BlockingReaderWriterQueue<short*> queue_;
  std::vector<float> sileroBuffer_;
  double sileroVadProbability_ = 0.0;
  bool speaking_ = false;
  std::atomic<bool> stopped_;
  std::mutex toggleLock_;
  std::thread startThread_;
  std::thread stopThread_;
  std::thread queueThread_;
  WebrtcVad webrtcVad_;
  std::vector<short> webrtcVadBuffer_;
  std::vector<bool> webrtcVadResults_;

 public:
  ChunkProcessorOptions options_;
  ChunkProcessor(std::string modelPath, ChunkProcessorOptions options);
  ~ChunkProcessor();
  void Process(short* audio);
  void Reset();
  void Start();
  void Stop();

  ALIGNED
};

}  // namespace speechrecorder
