const fs = require("fs");
const { SpeechRecorder } = require("../dist/index");

console.log("Recording...");
const recorder = new SpeechRecorder();
const writeStream = fs.createWriteStream("audio.raw");
recorder.start({
  onChunkStart: (leadingBuffer) => {
    writeStream.write(leadingBuffer);
  },
  onAudio: (audio, speech) => {
    if (speech) {
      writeStream.write(audio);
    }
  },
  onChunkEnd: () => {
    writeStream.end();
    process.exit(0);
  },
});
