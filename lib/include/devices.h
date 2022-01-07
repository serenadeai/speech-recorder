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
};

std::vector<Device> GetDevices();

}  // namespace speechrecorder
