#ifndef CHUNKQUEUE_H
#define CHUNKQUEUE_H

#include <nan.h>
#include <condition_variable>
#include <mutex>
#include <queue>

namespace speechrecorder {

template <class T>
class ChunkQueue {
 public:
  ChunkQueue(uint32_t maxQueue)
      : mActive(true), mMaxQueue(maxQueue), qu(), m(), cv() {}
  ~ChunkQueue() {}

  void enqueue(T t) {
    std::unique_lock<std::mutex> lk(m);
    while (mActive && (qu.size() >= mMaxQueue)) {
      cv.wait(lk);
    }
    qu.push(t);
    cv.notify_one();
  }

  T dequeue() {
    std::unique_lock<std::mutex> lk(m);
    while (mActive && qu.empty()) {
      cv.wait(lk);
    }
    T val;
    if (mActive) {
      val = qu.front();
      qu.pop();
      cv.notify_one();
    }
    return val;
  }

  size_t size() const {
    std::lock_guard<std::mutex> lk(m);
    return qu.size();
  }

  void quit() {
    std::lock_guard<std::mutex> lk(m);
    if ((0 == qu.size()) || (qu.size() >= mMaxQueue)) {
      // ensure release of any blocked thread
      mActive = false;
      cv.notify_all();
    }
  }

 private:
  bool mActive;
  uint32_t mMaxQueue;
  std::queue<T> qu;
  mutable std::mutex m;
  std::condition_variable cv;
};

}  // namespace speechrecorder

#endif
