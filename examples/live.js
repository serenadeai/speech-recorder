const { SpeechRecorder } = require("../dist/index");

console.log("Recording...");
const recorder = new SpeechRecorder();
recorder.start({
  onAudio: (audio, speech, speaking, volume, silence, probability) => {
    console.log(Date.now(), speech, probability);
  },
});
