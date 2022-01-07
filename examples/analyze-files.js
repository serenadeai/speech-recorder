const fs = require("fs");
const path = require("path");
const { SpeechRecorder } = require("../src/index");

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

let currentFile;
let samples = 0;
const leadingBufferFrames = 10;
const sampleRate = 16000;
const samplesPerFrame = 480;
let results = {};
let labels = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

const recorder = new SpeechRecorder({
  leadingBufferFrames,
  samplesPerFrame,
  sampleRate,
  onAudio: ({ audio, probability, volume }) => {
    samples += audio.length;
  },

  onChunkStart: ({ audio }) => {
    results[currentFile].speech.push([]);
    results[currentFile].speech[results[currentFile].speech.length - 1].push(samples / sampleRate);
  },

  onChunkEnd: () => {
    results[currentFile].speech[results[currentFile].speech.length - 1].push(samples / sampleRate);
  },
});

fs.readdir(process.argv[2], async (error, files) => {
  for (const file of files) {
    if (!file.endsWith(".wav")) {
      continue;
    }

    currentFile = file;
    samples = 0;
    results[file] = { speech: [] };
    console.log(`Processing ${file}...`);
    recorder.processFile(path.join(process.argv[2], file));
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
      if (isNaN(start) || isNaN(stop)) {
        continue;
      }

      const tolerance = 0.05;
      if (
        start - (leadingBufferFrames * samplesPerFrame) / sampleRate > label[0] + tolerance ||
        stop < label[1] - tolerance
      ) {
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
    `Noise was speech: ${noise > 0 ? (noiseWasSpeech.length / noise).toFixed(2) : 0} (${
      noiseWasSpeech.length
    } / ${noise})`
  );

  if (extra.length > 0) {
    console.log(
      `Average extra speech: ${(extra.reduce((a, b) => a + b) / extra.length).toFixed(2)}`
    );
    console.log(`p50 extra speech: ${quantile(extra, 0.5).toFixed(2)}`);
    console.log(`p90 extra speech: ${quantile(extra, 0.75).toFixed(2)}`);
    console.log(`Max extra speech: ${Math.max(...extra).toFixed(2)}`);
  }
});
