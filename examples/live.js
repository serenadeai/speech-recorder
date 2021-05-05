const { SpeechRecorder } = require("../dist/index");

console.log("Recording...");
const recorder = new SpeechRecorder();
recorder.start({
  onAudio: (audio, speech) => {
    console.log(Date.now(), speech);
  },
});
