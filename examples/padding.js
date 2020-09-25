const fs = require("fs");
const { SpeechRecorder } = require("../dist/index");

console.log("Recording...");
const recorder = new SpeechRecorder({
  silenceThreshold: 2,
  triggers: [
    {
      id: "short_silence",
      threshold: 10,
    },
    {
      id: "long_silence",
      threshold: 30,
    },
  ],
});

let write = false;
const writeStream = fs.createWriteStream("audio.raw");
recorder.start({
  onAudio: (audio, speech) => {
    if (write) {
      writeStream.write(audio);
    }
  },

  onChunkStart: (audio) => {
    console.log("chunk start");
    write = true;
    writeStream.write(audio);
  },

  onChunkEnd: (audio) => {
    console.log("chunk end");
  },

  onTrigger: (trigger) => {
    console.log(trigger);
    if (trigger.id == "short_silence") {
      write = false;
    } else if (trigger.id == "long_silence") {
      process.exit(0);
    }
  },
});
