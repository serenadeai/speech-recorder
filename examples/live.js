const { SpeechRecorder } = require("../src/index.js");

const recorder = new SpeechRecorder({
  onChunkStart: () => {
    console.log(Date.now(), "Chunk start");
  },
  onAudio: ({ speaking, probability, volume }) => {
    console.log(Date.now(), speaking, probability, volume);
  },
  onChunkEnd: () => {
    console.log(Date.now(), "Chunk end");
  },
});

console.log("Recording...");
recorder.start();
setTimeout(() => {
  console.log("Done!");
  recorder.stop();
}, 60000);
