const fs = require("fs");
const path = require("path");
const { SpeechRecorder } = require("../dist/index");

if (process.argv.length < 4) {
  console.log("Usage: node analyze-files.js /path/to/wav/files");
  process.exit(1);
}

const sampleRate = 16000;
let result = {};
fs.readdir(process.argv[2], async (error, files) => {
  for (const file of files) {
    if (!file.endsWith(".wav")) {
      continue;
    }

    let samples = 0;
    result[file] = { speech: [] };
    const recorder = new SpeechRecorder();
    await recorder.processFile(path.join(process.argv[2], file), {
      onAudio: (audio) => {
        samples += audio.length / 2;
      },

      onChunkStart: (audio) => {
        result[file].speech.push([]);
        result[file].speech[result[file].speech.length - 1].push(samples / sampleRate);
      },

      onChunkEnd: () => {
        result[file].speech[result[file].speech.length - 1].push(samples / sampleRate);
      },
    });
  }

  console.log(JSON.stringify(result, null, 2));
});
