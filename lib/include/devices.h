#pragma once

#include <string>

namespace speechrecorder {

struct Device {
  int id;
  std::string name;
  std::string apiName;
  int maxInputChannels;
  int maxOutputChannels;
  double defaultSampleRate;
  bool isDefaultInput;
  bool isDefaultOutput;

  Device(int id, std::string name, std::string apiName, int maxInputChannels,
         int maxOutputChannels, double defaultSampleRate, bool isDefaultInput,
         bool isDefaultOutput)
      : id(id),
        name(name),
        apiName(apiName),
        maxInputChannels(maxInputChannels),
        maxOutputChannels(maxOutputChannels),
        defaultSampleRate(defaultSampleRate),
        isDefaultInput(isDefaultInput),
        isDefaultOutput(isDefaultOutput) {}
};

std::vector<Device> GetDevices();

}  // namespace speechrecorder
