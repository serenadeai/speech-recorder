const fs = require("fs");
const { SpeechRecorder } = require("../dist/index");

console.log("Recording...");
const recorder = new SpeechRecorder({
  padding: 10,
  silence: 5,
});

recorder.start({
  onConsecutiveSilence: (silence) => {
    console.log(`Silence: ${silence}`);
  },
});
