import bindings from "bindings";
import * as os from "os";
import { Readable } from "stream";
import VAD from "webrtcvad";
const portAudioBindings = bindings("portaudio.node");

enum SpeakingState {
  Silence,
  Speaking,
  Trailing
}

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
  private audioStream?: AudioStream;
  private consecutiveNonSpeaking = 0;
  private leadingBuffer: Buffer[] = [];
  private options: any;
  private startDt = 0;
  private state: SpeakingState = SpeakingState.Silence;
  private trailingCount = 0;
  private vad: VAD;

  constructor(options: any = {}) {
    this.options = options;
    this.options.error = this.options.error || null;
    this.options.framesPerBuffer = this.options.framesPerBuffer || 160;
    this.options.highWaterMark = this.options.highWaterMark || 32000;
    this.options.leadingPadding = this.options.leadingPadding || 5;
    this.options.nonSpeakingThreshold = this.options.nonSpeakingThreshold || 22;
    this.options.sampleRate = this.options.sampleRate || 16000;
    this.options.skipInitial = this.options.skipInitial || 0;
    this.options.trailingPadding = this.options.trailingPadding || 0;
    this.options.vadLevel = this.options.vadLevel || 3;

    this.vad = new VAD(this.options.sampleRate, this.options.vadLevel);
  }

  start(startOptions: any = {}) {
    this.leadingBuffer = [];
    this.startDt = Date.now();

    this.audioStream = new AudioStream({
      channelCount: 1,
      deviceId: startOptions.deviceId || -1,
      error: this.options.error,
      highWaterMark: this.options.highWaterMark,
      framesPerBuffer: this.options.framesPerBuffer,
      sampleFormat: 16,
      sampleRate: this.options.sampleRate
    });

    this.audioStream.on("data", (e: any) => {
      if (Date.now() - this.startDt < this.options.skipInitial) {
        return;
      }

      const audio = e;
      if (startOptions.onAudio) {
        startOptions.onAudio(audio);
      }

      const speaking = this.vad.process(audio);

      // add to the leading buffer, making sure it doesn't grow past the maximum size
      if (this.state == SpeakingState.Silence && !speaking) {
        this.leadingBuffer.push(audio);
        while (this.leadingBuffer.length > this.options.leadingPadding) {
          this.leadingBuffer.shift();
        }
      }

      // when we transition from silence to speaking, flush the leading buffer
      else if (this.state == SpeakingState.Silence && speaking) {
        for (const data of this.leadingBuffer) {
          if (startOptions.onSpeech) {
            startOptions.onSpeech(data, "leading");
          }
        }

        this.state = SpeakingState.Speaking;
        this.leadingBuffer = [];
        if (startOptions.onSpeech) {
          startOptions.onSpeech(audio, "speaking");
        }
      }

      // stream continuously when speaking
      else if (this.state == SpeakingState.Speaking && speaking) {
        this.consecutiveNonSpeaking = 0;
        if (startOptions.onSpeech) {
          startOptions.onSpeech(audio, "speaking");
        }
      }

      // when we stop speaking, transition to trailing mode
      else if (this.state == SpeakingState.Speaking && !speaking) {
        this.trailingCount = 0;
        const trailing = this.options.trailingPadding > 0;
        let text = "speaking";

        if (this.consecutiveNonSpeaking == this.options.nonSpeakingThreshold) {
          this.state = trailing ? SpeakingState.Trailing : SpeakingState.Silence;
          text = trailing ? "trailing" : "final";
        }

        if (startOptions.onSpeech) {
          startOptions.onSpeech(audio, text);
        }

        this.consecutiveNonSpeaking++;
      }

      // stream trailing audio, marking the last one
      else if (this.state == SpeakingState.Trailing) {
        let text = "trailing";
        if (this.trailingCount == this.options.trailingPadding - 1) {
          text = "final";
          this.state = SpeakingState.Silence;
        }

        if (startOptions.onSpeech) {
          startOptions.onSpeech(audio, text);
        }

        this.trailingCount++;
      }
    });

    this.audioStream.on("error", (error: any) => {
      if (this.options.error) {
        this.options.error(error);
      }
    });

    this.audioStream.start();
  }

  stop() {
    this.audioStream.stop();
  }
}

export const getDevices = portAudioBindings.getDevices;
