
#include <chrono>
#include <iostream>
#include <thread>
#include <vector>

#include "chunk_processor.h"

int main(int argc, char** argv) {
  speechrecorder::ChunkProcessorOptions options;
  options.onChunkStart = [](std::vector<short> audio) {
    std::cout << "Chunk start" << std::endl;
  };
  options.onAudio = [](std::vector<short> audio, bool speaking, double volume,
                       bool speech, double probability,
                       int consecutiveSilence) {
    std::cout << "Speaking: " << speaking << " Volume: " << volume
              << " Probability: " << probability << std::endl;
  };
  options.onChunkEnd = []() {
    std::cout << "Chunk end" << std::endl;
  };

  speechrecorder::ChunkProcessor processor(argv[1], options);
  processor.Start();
  std::this_thread::sleep_for(std::chrono::milliseconds(3000));
  processor.Stop();
  std::cout << "Done" << std::endl;
}
