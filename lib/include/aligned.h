#pragma once

#ifndef ALIGNED
#if defined(_WIN32)
#define ALIGNED                                                   \
  void* operator new(size_t i) { return _aligned_malloc(i, 64); } \
  void operator delete(void* p) { _aligned_free(p); }
#elif defined(__linux__)
#define ALIGNED                                                 \
  void* operator new(size_t i) { return aligned_alloc(64, i); } \
  void operator delete(void* p) { free(p); }
#else
#define ALIGNED
#endif
#endif
