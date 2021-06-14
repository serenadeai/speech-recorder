import bindings from "bindings";
import * as fs from "fs";
import * as os from "os";
import { Readable } from "stream";
import WebrtcVad from "webrtcvad";
import uuid from "uuid/v4";
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
  private consecutiveSpeech: number = 0;
  private consecutiveSilence: number = 0;
  private disableSecondPass: boolean = false;
  private error: null | ((e: any) => void) = null;
  private framesPerBuffer: number = 320;
  private highWaterMark: number = 64000;
  private leadingBuffer: Buffer[] = [];
  private leadingPadding: number = 20;
  private minimumVolume: number = 200;
  private sampleRate: number = 16000;
  private speaking: boolean = false;
  private speakingThreshold: number = 1;
  private silenceThreshold: number = 10;
  private triggers: Trigger[] = [];
  private webrtcVad: WebrtcVad;
  private vad = new SileroVad();
  private vadBuffer: number[][] = [];
  private vadBufferSize: number = 10;
  private vadRateLimit: number = 0;
  private vadThreshold: number = 0.75;

  constructor(options: any = {}) {
    if (options.disableSecondPass !== undefined) {
      this.disableSecondPass = options.disableSecondPass;
    }

    if (options.error) {
      this.error = options.error;
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

    if (options.vadThreshold !== undefined) {
      this.vadThreshold = options.vadThreshold;
    }

    this.webrtcVad = new WebrtcVad(this.sampleRate, options.firstPassLevel || 3);
  }

  async onData(startOptions: any, audio: any) {
    let sum = 0;
    let normalized: number[] = [];
    for (let i = 0; i < audio.length; i += 2) {
      const e = audio.readInt16LE(i);
      sum += Math.pow(e, 2);
      normalized.push(e / 32767);
    }

    this.vadBuffer.push(normalized);
    while (this.vadBuffer.length > this.vadBufferSize) {
      this.vadBuffer.shift();
    }

    // require a minimum (very low) volume threshold as well as a positive VAD result
    const volume = Math.floor(Math.sqrt(sum / (audio.length / 2)));
    let speaking = !!(
      this.webrtcVad.process(audio) &&
      volume > this.minimumVolume &&
      this.vadBuffer.length == this.vadBufferSize
    );
    let probability = speaking ? 1 : 0;

    // double-check the WebRTC VAD with the Silero VAD
    if (
      !this.disableSecondPass &&
      speaking &&
      this.vadBuffer.length == this.vadBufferSize &&
      this.vad.ready
    ) {
      probability = await this.vad.process([].concat(...this.vadBuffer));
      speaking = probability > this.vadThreshold;

      // only trigger the rate limit while we're speaking, or else the next call might not use
      // the Silero VAD, which would start the speaking state
      if (this.vadRateLimit > 0 && speaking) {
        this.vadBuffer.splice(0, Math.min(this.vadRateLimit, this.vadBufferSize));
      }
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
        while (this.leadingBuffer.length > this.leadingPadding) {
          this.leadingBuffer.shift();
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

  async start(startOptions: any = {}) {
    if (!this.disableSecondPass) {
      await this.vad.load();
    }

    this.leadingBuffer = [];
    this.audioStream = new AudioStream({
      channelCount: 1,
      deviceId: startOptions.deviceId || -1,
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
  }

  stop() {
    this.audioStream.stop();
    this.reset();
  }
}

export const getDevices = portAudioBindings.getDevices;
