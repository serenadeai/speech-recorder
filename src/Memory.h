#ifndef MEMORY_H
#define MEMORY_H

#include <memory>

namespace speechrecorder {

class Memory {
 public:
  static std::shared_ptr<Memory> makeNew(uint32_t srcBytes) {
    return std::make_shared<Memory>(srcBytes);
  }
  static std::shared_ptr<Memory> makeNew(uint8_t *buf, uint32_t srcBytes) {
    return std::make_shared<Memory>(buf, srcBytes);
  }

  Memory(uint32_t numBytes)
      : mOwnAlloc(true), mNumBytes(numBytes), mBuf(new uint8_t[mNumBytes]) {}
  Memory(uint8_t *buf, uint32_t numBytes)
      : mOwnAlloc(false), mNumBytes(numBytes), mBuf(buf) {}
  ~Memory() {
    if (mOwnAlloc) delete[] mBuf;
  }

  uint32_t numBytes() const { return mNumBytes; }
  uint8_t *buf() const { return mBuf; }

 private:
  const bool mOwnAlloc;
  const uint32_t mNumBytes;
  uint8_t *const mBuf;
};

}  // namespace speechrecorder

#endif
