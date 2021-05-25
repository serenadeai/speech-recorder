const { SpeechRecorder } = require("../dist/index");

console.log("Recording...");
const recorder = new SpeechRecorder();
recorder.start({
  onAudio: (audio, speaking, speech, volume, silence, probability) => {
    console.log(Date.now(), "speaking:", speaking, "current:", speech, "probability:", probability);
  },
});
