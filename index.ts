import bindings from "bindings";
import * as fs from "fs";
import * as os from "os";
import { WaveFile } from "wavefile";
import { Readable } from "stream";
import WebrtcVad from "webrtcvad";
import SileroVad from "./vad";

const portAudioPath = `${__dirname}/../build/Release/portaudio.node`;
let portAudioBindings: any;
if (fs.existsSync(portAudioPath)) {
  portAudioBindings = require(portAudioPath);
} else {
  portAudioBindings = bindings("portaudio.node");
}

export type Trigger = {
  id: string;
  threshold: number;
};

class AudioStream extends Readable {
  private audio: any;
  private error: any;

  constructor(options: any = {}) {
    super({
      highWaterMark: options.highWaterMark,
      objectMode: false,
    });

    this.audio = new portAudioBindings.AudioIn(options);
    this.error = options.error || null;
  }

  _read(size: number) {
    this.audio.read(size, (err: any, buf: any) => {
      if (!err) {
        this.push(buf);
      } else {
        if (this.error) {
          this.error(err);
        }
      }
    });
  }

  start() {
    this.audio.start();
  }

  stop() {
    this.audio.quit(() => {});
  }
}

export class SpeechRecorder {
  private audioStarted = false;
  private audioStream?: AudioStream;
  private buffersUntilVad: number = 0;
  private consecutiveSpeech: number = 0;
  private consecutiveSilence: number = 0;
  private disableSecondPass: boolean = false;
  private error: null | ((e: any) => void) = null;
  private framesPerBuffer: number = 320;
  private highWaterMark: number = 64000;
  private leadingBuffer: Buffer[] = [];
  private leadingPadding: number = 20;
  private minimumVolume: number = 1;
  private sampleRate: number = 16000;
  private speaking: boolean = false;
  private speakingThreshold: number = 1;
  private silenceThreshold: number = 10;
  private triggers: Trigger[] = [];
  private vad = new SileroVad();
  private vadBuffer: number[] = [];
  // 250 ms so that it's consistent with the silero python example.
  private vadBufferSize: number = 4000;
  private vadLastProbability: number = 0;
  private vadLastSpeaking: boolean = false;
  private vadRateLimit: number = 3;
  private vadSilenceThreshold: number = 0.1;
  private vadSpeechThreshold: number = 0.75;
  private webrtcVad: WebrtcVad;
  private webrtcResultsBuffer: boolean[] = [];
  private webrtcResultsBufferSize: number = 3;

  constructor(options: any = {}) {
    if (options.disableSecondPass !== undefined) {
      this.disableSecondPass = options.disableSecondPass;
    }

    if (options.error !== undefined) {
      this.error = options.error;
    }

    if (options.firstPassResultsBufferSize !== undefined) {
      this.webrtcResultsBufferSize = options.firstPassResultsBufferSize;
    }

    if (options.framesPerBuffer !== undefined) {
      this.framesPerBuffer = options.framesPerBuffer;
    }

    if (options.highWaterMark !== undefined) {
      this.highWaterMark = options.highWaterMark;
    }

    if (options.leadingPadding !== undefined) {
      this.leadingPadding = options.leadingPadding;
    }

    if (options.minimumVolume !== undefined) {
      this.minimumVolume = options.minimumVolume;
    }

    if (options.silenceThreshold !== undefined) {
      this.silenceThreshold = options.silenceThreshold;
    }

    if (options.speakingThreshold !== undefined) {
      this.speakingThreshold = options.speakingThreshold;
    }

    if (options.triggers !== undefined) {
      this.triggers = options.triggers;
    }

    if (options.vadBufferSize !== undefined) {
      this.vadBufferSize = options.vadBufferSize;
    }

    if (options.vadRateLimit !== undefined) {
      this.vadRateLimit = options.vadRateLimit;
    }

    if (options.vadSilenceThreshold !== undefined) {
      this.vadSilenceThreshold = options.vadSilenceThreshold;
    }

    if (options.vadSpeechThreshold !== undefined) {
      this.vadSpeechThreshold = options.vadSpeechThreshold;
    }

    this.webrtcVad = new WebrtcVad(this.sampleRate, options.firstPassLevel || 1);
  }

  async load() {
    if (!this.disableSecondPass) {
      await this.vad.load();
    }
  }

  async onData(startOptions: any, audio: any) {
    let sum = 0;
    let normalized: number[] = [];
    for (let i = 0; i < audio.length; i += 2) {
      const e = audio.readInt16LE(i);
      sum += Math.pow(e, 2);
      normalized.push(e / 32767);
    }

    if (this.buffersUntilVad > 0) {
      this.buffersUntilVad--;
    }

    this.vadBuffer.push(...normalized);
    if (this.vadBuffer.length > this.vadBufferSize) {
      this.vadBuffer.splice(0, this.vadBuffer.length - this.vadBufferSize);
    }

    const volume = Math.floor(Math.sqrt(sum / (audio.length / 2)));
    this.webrtcResultsBuffer.push(this.webrtcVad.process(audio));
    if (this.webrtcResultsBuffer.length > this.webrtcResultsBufferSize) {
      this.webrtcResultsBuffer.splice(
        0,
        this.webrtcResultsBuffer.length - this.webrtcResultsBufferSize
      );
    }

    // until we've filled up the VAD buffer, ignore the results of both VADs
    let speaking = !!(
      this.webrtcResultsBuffer.some((e) => e) &&
      volume > this.minimumVolume &&
      this.vadBuffer.length == this.vadBufferSize
    );
    let probability = speaking ? 1 : 0;

    // double-check the WebRTC VAD with the Silero VAD
    if (speaking && !this.disableSecondPass && this.vad.ready) {
      // cache values of probability and speaking for buffersUntilVad frames
      if (this.buffersUntilVad == 0) {
        this.vadLastProbability = await this.vad.process(this.vadBuffer);
        this.vadLastSpeaking = this.speaking
          ? this.vadLastProbability > this.vadSilenceThreshold
          : this.vadLastProbability > this.vadSpeechThreshold;
        this.buffersUntilVad = this.vadRateLimit;
      }

      speaking = this.vadLastSpeaking;
      probability = this.vadLastProbability;
    }

    if (speaking) {
      this.consecutiveSilence = 0;
      this.consecutiveSpeech++;
    } else {
      this.consecutiveSilence++;
      this.consecutiveSpeech = 0;
    }

    if (!this.speaking) {
      // keep frames before speaking in a buffer
      this.leadingBuffer.push(Buffer.from(audio));

      // if we're now speaking, then flush the buffer and change state
      if (this.consecutiveSpeech >= this.speakingThreshold) {
        this.audioStarted = true;
        this.speaking = true;
        if (this.leadingBuffer.length > 0) {
          if (startOptions.onChunkStart) {
            startOptions.onChunkStart(Buffer.concat(this.leadingBuffer));
          }

          this.leadingBuffer = [];
        }
      }

      // we're still not speaking, so trim the buffer to its specified size
      else {
        if (this.leadingBuffer.length > this.leadingPadding) {
          this.leadingBuffer.splice(0, this.leadingBuffer.length - this.leadingPadding);
        }
      }
    }

    if (startOptions.onAudio) {
      startOptions.onAudio(
        audio,
        this.speaking,
        speaking,
        volume,
        this.audioStarted ? this.consecutiveSilence : 0,
        probability
      );
    }

    if (this.speaking) {
      // we're no longer speaking
      if (this.consecutiveSilence == this.silenceThreshold) {
        this.speaking = false;
        if (startOptions.onChunkEnd) {
          startOptions.onChunkEnd();
        }
      }
    }

    for (const trigger of this.triggers) {
      if (this.audioStarted && this.consecutiveSilence == trigger.threshold) {
        if (startOptions.onTrigger) {
          startOptions.onTrigger(trigger);
        }
      }
    }
  }

  async processFile(path: string, startOptions: any = {}) {
    if (!startOptions) {
      startOptions = {};
    }

    this.reset();
    await this.load();

    const wav = new WaveFile(fs.readFileSync(path));
    const samples = wav.getSamples(false, Int32Array);
    for (let i = 0; i < samples.length; i += this.framesPerBuffer) {
      let buffer = [];
      for (let j = 0; j < this.framesPerBuffer; j++) {
        buffer.push(samples[i + j] & 0xff);
        buffer.push((samples[i + j] >> 8) & 0xff);
      }

      await this.onData(startOptions, Buffer.from(buffer));
    }
  }

  async start(startOptions: any = {}) {
    if (!startOptions) {
      startOptions = {};
    }

    let deviceId = startOptions.deviceId;
    if (deviceId === undefined) {
      deviceId = -1;
    }

    this.reset();
    await this.load();
    this.leadingBuffer = [];
    this.audioStream = new AudioStream({
      channelCount: 1,
      deviceId,
      error: this.error,
      highWaterMark: this.highWaterMark,
      framesPerBuffer: this.framesPerBuffer,
      sampleFormat: 16,
      sampleRate: this.sampleRate,
    });

    this.audioStream.on("data", (audio: any) => {
      this.onData(startOptions, audio);
    });

    this.audioStream.on("error", (error: any) => {
      if (this.error) {
        this.error(error);
      }
    });

    this.audioStream.start();
  }

  reset() {
    this.audioStarted = false;
    this.consecutiveSilence = 0;
    this.consecutiveSpeech = 0;
    this.buffersUntilVad = 0;
    this.vadLastSpeaking = false;
    this.vadLastProbability = 0;
  }

  stop() {
    this.audioStream.stop();
    this.audioStream.destroy();
    this.audioStream = null;
    this.reset();
  }
}

export const getDevices = portAudioBindings.getDevices;
