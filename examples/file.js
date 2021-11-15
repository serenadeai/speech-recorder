const fs = require("fs");
const path = require("path");
const { SpeechRecorder } = require("../dist/index");

if (process.argv.length < 3) {
  console.log("Usage: node file.js /path/to/wav/files");
  process.exit(1);
}

fs.readdir(process.argv[2], async (error, files) => {
  for (const file of files) {
    let start = 0;
    let end = 0;

    const recorder = new SpeechRecorder();
    await recorder.processFile(path.join(process.argv[2], file), {
      onChunkStart: (audio) => {
        start++;
      },

      onChunkEnd: () => {
        end++;
      },
    });

    console.log(file, start, end);
  }
});
