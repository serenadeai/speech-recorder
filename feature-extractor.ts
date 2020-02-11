import VAD from "webrtcvad";
const meyda = require("meyda");

export class FeatureExtractor {
  private vadInstance: VAD;
  private zeroBufferSize: number;

  constructor(sampleRate: number, vadLevel: number) {
    this.vadInstance = new VAD(sampleRate, vadLevel);
  }

  features(normalized: number[]): any {
    return {
      loudness: this.loudness(normalized),
      mfcc: this.mfcc(normalized),
      sharpness: this.sharpness(normalized)
    };
  }

  featuresFromBuffer(audio: Buffer): any {
    const normalized = this.normalize(audio);
    return this.features(normalized);
  }

  loudness(normalized: number[]): number {
    return meyda.extract("loudness", normalized).total;
  }

  mfcc(normalized: number[]): number[] {
    return meyda.extract("mfcc", normalized);
  }

  normalize(audio: Buffer): number[] {
    // normalize 16-bit signed integers to signed floats between -1.0 and 1.0
    let normalized = [];
    for (let i = 0; i < audio.length; i += 2) {
      normalized.push(audio.readInt16LE(i) / 32767);
    }

    // right-pad zeroes to the next power of two
    const zeroBufferSize = Math.pow(2, Math.ceil(Math.log(normalized.length) / Math.log(2)));
    for (let i = normalized.length; i < zeroBufferSize; i++) {
      normalized.push(0);
    }

    return normalized;
  }

  sharpness(normalized: number[]): number {
    return meyda.extract("perceptualSharpness", normalized);
  }

  vad(audio: Buffer): boolean {
    return this.vadInstance.process(audio);
  }
}
