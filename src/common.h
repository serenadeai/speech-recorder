#ifndef COMMON_H
#define COMMON_H

#include <cstdio>

#define DEBUG_PRINT_ERR(s, ...)          \
  if (speechrecorder::DEBUG) {           \
    fprintf((stderr), (s), __VA_ARGS__); \
  }

namespace speechrecorder {

extern bool DEBUG;

}  // namespace speechrecorder

#endif
