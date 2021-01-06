import bindings from "bindings";
import * as os from "os";
import { Readable } from "stream";
import VAD from "webrtcvad";
import uuid from "uuid/v4";
const portAudioBindings = bindings("portaudio.node");

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
  private chunk: string = "";
  private consecutiveSpeech: number = 0;
  private consecutiveSilence: number = 0;
  private error: null | ((e: any) => void) = null;
  private framesPerBuffer: number = 320;
  private highWaterMark: number = 64000;
  private leadingBuffer: Buffer[] = [];
  private leadingPadding: number = 30;
  private sampleRate: number = 16000;
  private speaking: boolean = false;
  private speakingThreshold: number = 5;
  private silenceThreshold: number = 30;
  private triggers: Trigger[] = [];
  private vad: VAD;

  constructor(options: any = {}) {
    if (options.error) {
      this.error = options.error;
    }

    if (options.framesPerBuffer) {
      this.framesPerBuffer = options.framesPerBuffer;
    }

    if (options.highWaterMark) {
      this.highWaterMark = options.highWaterMark;
    }

    if (options.leadingPadding) {
      this.leadingPadding = options.leadingPadding;
    }

    if (options.sampleRate) {
      this.sampleRate = options.sampleRate;
    }

    if (options.silenceThreshold) {
      this.silenceThreshold = options.silenceThreshold;
    }

    if (options.speakingThreshold) {
      this.speakingThreshold = options.speakingThreshold;
    }

    if (options.triggers) {
      this.triggers = options.triggers;
    }

    this.vad = new VAD(this.sampleRate, options.level || 3);
  }

  onData(startOptions: any, audio: any) {
    const speaking = this.vad.process(audio);
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
      startOptions.onAudio(audio, this.speaking, speaking);
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

    if (this.audioStarted && this.consecutiveSilence > 0 && startOptions.onConsecutiveSilence) {
      startOptions.onConsecutiveSilence(this.consecutiveSilence);
    }

    for (const trigger of this.triggers) {
      if (this.audioStarted && this.consecutiveSilence == trigger.threshold) {
        if (startOptions.onTrigger) {
          startOptions.onTrigger(trigger);
        }
      }
    }
  }

  start(startOptions: any = {}) {
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
