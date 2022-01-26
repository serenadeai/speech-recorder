const path = require("path");
const { SpeechRecorder, devices } = require("bindings")("speechrecorder.node");

class Wrapper {
  constructor(options, model) {
    options = options ? options : {};
    options.consecutiveFramesForSilence =
      options.consecutiveFramesForSilence !== undefined ? options.consecutiveFramesForSilence : 10;
    options.consecutiveFramesForSpeaking =
      options.consecutiveFramesForSpeaking !== undefined ? options.consecutiveFramesForSpeaking : 1;
    options.device = options.device !== undefined ? options.device : -1;
    options.leadingBufferFrames =
      options.leadingBufferFrames !== undefined ? options.leadingBufferFrames : 10;
    options.onChunkStart = options.onChunkStart !== undefined ? options.onChunkStart : (data) => {};
    options.onAudio =
      options.onAudio !== undefined
        ? options.onAudio
        : (audio, speaking, volume, speech, probability) => {};
    options.onChunkEnd = options.onChunkEnd !== undefined ? options.onChunkEnd : (data) => {};
    options.samplesPerFrame = options.samplesPerFrame !== undefined ? options.samplesPerFrame : 480;
    options.sampleRate = options.sampleRate !== undefined ? options.sampleRate : 16000;
    options.sileroVadBufferSize =
      options.sileroVadBufferSize !== undefined ? options.sileroVadBufferSize : 2000;
    options.sileroVadRateLimit =
      options.sileroVadRateLimit !== undefined ? options.sileroVadRateLimit : 3;
    options.sileroVadSilenceThreshold =
      options.sileroVadSilenceThreshold !== undefined ? options.sileroVadSilenceThreshold : 0.1;
    options.sileroVadSpeakingThreshold =
      options.sileroVadSpeakingThreshold !== undefined ? options.sileroVadSpeakingThreshold : 0.3;
    options.webrtcVadLevel = options.webrtcVadLevel !== undefined ? options.webrtcVadLevel : 3;
    options.webrtcVadBufferSize =
      options.webrtcVadBufferSize !== undefined ? options.webrtcVadBufferSize : 480;
    options.webrtcVadResultsSize =
      options.webrtcVadResultsSize !== undefined ? options.webrtcVadResultsSize : 10;

    this.inner = new SpeechRecorder(
      model !== undefined ? model : path.join(__dirname, "..", "lib", "resources", "vad.onnx"),
      (event, data) => {
        if (event == "chunkStart") {
          options.onChunkStart({ audio: data.audio });
        } else if (event == "audio") {
          options.onAudio({
            audio: data.audio,
            speaking: data.speaking,
            probability: data.probability,
            volume: data.volume,
            speech: data.speech,
            consecutiveSilence: data.consecutiveSilence,
          });
        } else if (event == "chunkEnd") {
          options.onChunkEnd();
        }
      },
      options
    );
  }

  processFile(file) {
    this.inner.processFile(path.resolve(file));
  }

  start() {
    this.inner.start();
  }

  stop() {
    this.inner.stop();
  }
}

exports.SpeechRecorder = Wrapper;
exports.devices = devices;
