#include <portaudio.h>

#include <string>
#include <vector>

#include "devices.h"

namespace speechrecorder {

std::vector<Device> GetDevices() {
  Pa_Initialize();
  std::vector<Device> result;

  int count = Pa_GetDeviceCount();
  for (int i = 0; i < count; i++) {
    const PaDeviceInfo* info = Pa_GetDeviceInfo(i);
    bool include = info->maxInputChannels > 0;

#ifdef WIN32
    if (strcmp(Pa_GetHostApiInfo(info->hostApi)->name, "MME") != 0) {
      include = false;
    }
#endif

    if (include) {
      result.emplace_back(i, info->name, Pa_GetHostApiInfo(info->hostApi)->name,
                          info->maxInputChannels, info->maxOutputChannels,
                          info->defaultSampleRate,
                          i == Pa_GetDefaultInputDevice(),
                          i == Pa_GetDefaultOutputDevice());
    }
  }

  return result;
}

}  // namespace speechrecorder
