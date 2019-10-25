const fs = require("fs");
const { SpeechRecorder } = require("../dist/index");

console.log("Recording...");
const recorder = new SpeechRecorder();
const writeStream = fs.createWriteStream("audio.raw");
recorder.start({
  onAudio: audio => {
    writeStream.write(audio);
  }
});
