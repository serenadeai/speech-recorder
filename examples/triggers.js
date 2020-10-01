const fs = require("fs");
const { SpeechRecorder } = require("../dist/index");

console.log("Recording...");
const recorder = new SpeechRecorder({
  padding: 10,
  silence: 5,
  triggers: [
    {
      id: "one",
      threshold: 10,
    },
    {
      id: "two",
      threshold: 25,
    },
    {
      id: "three",
      threshold: 50,
    },
  ],
});

recorder.start({
  onAudio: (audio, speech) => {
    console.log(Date.now(), "speech =", speech);
  },
  onTrigger: (trigger) => {
    console.log(Date.now(), "trigger =", trigger);
  },
});
