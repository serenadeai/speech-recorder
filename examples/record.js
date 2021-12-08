const fs = require("fs");
const { SpeechRecorder } = require("../dist/index");
const { WaveFile } = require("wavefile");

if (process.argv.length < 3) {
  console.log("Usage: node record.js /path/to/output.wav");
  process.exit(1);
}

let buffer = [];
const recorder = new SpeechRecorder();
console.log("Ready...");
setTimeout(() => {
  console.log("Go!");
  recorder.start({
    onAudio: (audio) => {
      for (let i = 0; i < audio.length; i += 2) {
        buffer.push(audio.readInt16LE(i));
      }

      if (buffer.length == 16000 * 5) {
        let wav = new WaveFile();
        wav.fromScratch(1, 16000, "16", buffer);
        fs.writeFileSync(process.argv[2], wav.toBuffer());
        process.exit(1);
      }
    },
  });
}, 1000);
