const fs = require("fs");
const { SpeechRecorder } = require("../dist/index");

console.log("Recording...");
const recorder = new SpeechRecorder({
  silence: 50,
  triggers: [
    {
      id: "before",
      threshold: 15
    },
    {
      id: "at",
      threshold: 50
    },
    {
      id: "after",
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
