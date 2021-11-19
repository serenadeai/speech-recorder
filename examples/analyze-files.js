const fs = require("fs");
const path = require("path");
const { SpeechRecorder } = require("../dist/index");

const quantile = (elements, q) => {
  const sorted = elements.sort((a, b) => a - b);
  const p = (sorted.length - 1) * q;
  const base = Math.floor(p);
  const rest = p - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
};

if (process.argv.length < 4) {
  console.log("Usage: node analyze-files.js /path/to/wav/files /path/to/labels");
  process.exit(1);
}

const sampleRate = 16000;
let results = {};
let labels = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
fs.readdir(process.argv[2], async (error, files) => {
  for (const file of files) {
    if (!file.endsWith(".wav")) {
      continue;
    }

    let samples = 0;
    results[file] = { speech: [] };
    const recorder = new SpeechRecorder();
    await recorder.processFile(path.join(process.argv[2], file), {
      onAudio: (audio) => {
        samples += audio.length / 2;
      },

      onChunkStart: (audio) => {
        results[file].speech.push([]);
        results[file].speech[results[file].speech.length - 1].push(samples / sampleRate);
      },

      onChunkEnd: () => {
        results[file].speech[results[file].speech.length - 1].push(samples / sampleRate);
      },
    });
  }

  let speechWindowTooSmall = [];
  let noiseWasSpeech = [];
  let noise = 0;
  let speech = 0;
  let extra = [];
  for (const i of Object.keys(results)) {
    const label = labels[i].speech;
    const result = results[i].speech;

    if (label.length == 0) {
      noise++;
    } else {
      speech++;
    }

    if (label.length == 0 && result.length > 0) {
      console.log("Noise was speech:", i);
      console.log("VAD:", result);
      noiseWasSpeech.push(i);
    }

    if (label.length > 0 && result.length > 0) {
      const start = Math.min(...result.map((e) => e[0]));
      const stop = Math.max(...result.map((e) => e[1]));
      const tolerance = 0.05;
      if (start - 0.4 > label[0] + tolerance || stop < label[1] - tolerance) {
        console.log("Speech window too small:", i);
        console.log("Label:", label);
        console.log("VAD:", result, start, stop);
        speechWindowTooSmall.push(i);
      } else if (stop > label[1]) {
        extra.push(stop - label[1]);
      }
    }
  }

  console.log(
    `\nSpeech window too small: ${(speechWindowTooSmall.length / speech).toFixed(2)} (${
      speechWindowTooSmall.length
    } / ${speech})`
  );

  console.log(
    `Noise was speech: ${(noiseWasSpeech.length / noise).toFixed(2)} (${
      noiseWasSpeech.length
    } / ${noise})`
  );

  console.log(`Average extra speech: ${(extra.reduce((a, b) => a + b) / extra.length).toFixed(2)}`);
  console.log(`p50 extra speech: ${quantile(extra, 0.5).toFixed(2)}`);
  console.log(`p90 extra speech: ${quantile(extra, 0.75).toFixed(2)}`);
  console.log(`Max extra speech: ${Math.max(...extra).toFixed(2)}`);
});
