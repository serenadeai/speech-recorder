const fs = require("fs");
const { SpeechRecorder } = require("../src/index");
const { WaveFile } = require("wavefile");

if (process.argv.length < 3) {
  console.log("Usage: node record.js /path/to/output.wav");
  process.exit(1);
}

let buffer = [];
const sampleRate = 16000;
const recorder = new SpeechRecorder({
  onAudio: ({ audio }) => {
    for (let i = 0; i < audio.length; i++) {
      buffer.push(audio[i]);
    }

    if (buffer.length >= sampleRate * 5) {
      let wav = new WaveFile();
      wav.fromScratch(1, sampleRate, "16", buffer);
      fs.writeFileSync(process.argv[2], wav.toBuffer());
      process.exit(1);
    }
  },
});

console.log("Ready...");
setTimeout(() => {
  console.log("Go!");
  recorder.start();
}, 1000);
