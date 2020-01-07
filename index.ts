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
      objectMode: false
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
  private consecutiveSilence: number = 0;
  private error: null | ((e: any) => void);
  private framesPerBuffer: number;
  private highWaterMark: number;
  private leadingBuffer: Buffer[] = [];
  private padding: number;
  private results: boolean[] = [];
  private sampleRate: number;
  private silence: number;
  private skip: number;
  private smoothing: number;
  private speaking: boolean = false;
  private totalFrames: number = 0;
  private triggers: Trigger[] = [];
  private vad: VAD;

  constructor(options: any = {}) {
    this.error = options.error || null;
    this.framesPerBuffer = options.framesPerBuffer || 160;
    this.highWaterMark = options.highWaterMark || 64000;
    this.padding = options.padding || 10;
    this.sampleRate = options.sampleRate || 16000;
    this.silence = options.silence || 50;
    this.skip = options.skip || 10;
    this.smoothing = options.smoothing || 2;
    this.triggers = options.triggers || [];

    this.vad = new VAD(this.sampleRate, options.level || 3);
    this.chunk = uuid();
  }

  private onData(startOptions: any, audio: any) {
    // keep in memory results for the maximum window size across all thresholds
    const speaking = this.vad.process(audio);
    this.results.push(speaking);
    while (this.results.length > this.smoothing) {
      this.results.shift();
    }

    if (this.totalFrames <= this.skip) {
      this.totalFrames++;
    }

    // we're only speaking if all samples in the smoothing window are true
    const smoothedSpeaking =
      this.totalFrames > this.skip &&
      this.results.length == this.smoothing &&
      this.results.every(e => e);
    if (smoothedSpeaking) {
      this.consecutiveSilence = 0;
      this.audioStarted = true;
    } else {
      this.consecutiveSilence++;
    }

    // we haven't detected any speech yet
    if (!this.speaking) {
      // keep frames before speaking in a buffer
      this.leadingBuffer.push(audio);

      // we're speaking if we have smoothing number of speaking frames
      if (smoothedSpeaking) {
        // if we're now speaking, then flush the buffer and change state
        this.speaking = true;
        this.chunk = uuid();

        for (const data of this.leadingBuffer) {
          if (startOptions.onSpeech) {
            startOptions.onSpeech(data, this.chunk);
          }
        }

        this.leadingBuffer = [];
      }

      // we're still not speaking, so trim the buffer to its specified size
      else {
        while (this.leadingBuffer.length > this.padding) {
          this.leadingBuffer.shift();
        }
      }
    }

    // we're in speaking mode (though the current frame might not be speech)
    else {
      // stream all speech audio
      if (startOptions.onSpeech) {
        startOptions.onSpeech(audio, this.chunk);
      }

      if (this.consecutiveSilence == this.silence) {
        this.speaking = false;
      }
    }

    if (startOptions.onAudio) {
      startOptions.onAudio(audio, this.speaking, speaking);
    }

    for (const trigger of this.triggers) {
      if (this.audioStarted && this.consecutiveSilence == trigger.threshold) {
        startOptions.onTrigger(trigger);
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
      sampleRate: this.sampleRate
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

  stop() {
    this.audioStream.stop();
  }
}

export const getDevices = portAudioBindings.getDevices;
