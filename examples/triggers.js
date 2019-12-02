const fs = require("fs");
const { SpeechRecorder } = require("../dist/index");

console.log("Recording...");
const recorder = new SpeechRecorder({
  silence: 80,
  triggers: [
    {
      id: "soft",
      threshold: 15
    },
    {
      id: "hard",
      threshold: 80
    }
  ]
});

recorder.start({
  onSpeech: audio => {},
  onTrigger: trigger => {
    console.log(Date.now(), trigger);
  }
});
