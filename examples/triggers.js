const fs = require("fs");
const { SpeechRecorder } = require("../dist/index");

console.log("Recording...");
const recorder = new SpeechRecorder({
  padding: 20,
  silence: 50,
  triggers: [
    {
      id: "one",
      threshold: 20
    },
    {
      id: "two",
      threshold: 50
    },
    {
      id: "three",
      threshold: 100
    }
  ]
});

recorder.start({
  onSpeech: audio => {},
  onTrigger: trigger => {
    console.log(Date.now(), trigger);
  }
});
