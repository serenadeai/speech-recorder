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
  private consecutiveNonSpeakingState: number = 0;
  private consecutiveVADSpeech: number = 0;
  private consecutiveVADNonSpeech: number = 0;
  private error: null | ((e: any) => void);
  private frame: number = 0;
  private framesPerBuffer: number;
  private highWaterMark: number;
  private leadingBuffer: { frame: number; audio: Buffer }[] = [];
  private speakingThreshold: number;
  private padding: number;
  private sampleRate: number;
  private speaking: boolean = false;
  private trailingSilenceThreshold: number;
  private triggers: Trigger[] = [];
  private vad: VAD;

  constructor(options: any = {}) {
    this.error = options.error || null;
    // TODO: Warning: values of 0 here will evaluate to the defaults!
    this.framesPerBuffer = options.framesPerBuffer || 320;
    this.highWaterMark = options.highWaterMark || 64000;
    this.speakingThreshold = options.speakingThreshold || 5;
    this.padding = options.padding || 10;
    this.sampleRate = options.sampleRate || 16000;
    this.trailingSilenceThreshold = options.trailingSilenceThreshold || 5;
    this.triggers = options.triggers || [];

    this.chunk = uuid();
    this.vad = new VAD(this.sampleRate, options.level || 3);
  }

  onData(startOptions: any, audio: any) {
    const speaking = this.vad.process(audio);
    if (speaking) {
      this.consecutiveVADNonSpeech = 0;
      this.consecutiveVADSpeech++;
    } else {
      this.consecutiveVADNonSpeech++;
      this.consecutiveVADSpeech = 0;
    }

    if (startOptions.onAudio) {
      startOptions.onAudio(audio, this.speaking, this.frame, speaking);
    }

    // we haven't detected any speech yet
    if (!this.speaking) {
      this.consecutiveNonSpeakingState++;

      // keep frames before speaking in a buffer
      this.leadingBuffer.push({ frame: this.frame, audio: Buffer.from(audio) });

      // if we're now speaking, then flush the buffer and change state
      if (this.consecutiveVADSpeech >= this.speakingThreshold) {
        this.audioStarted = true;
        this.speaking = true;
        this.chunk = uuid();
        this.consecutiveNonSpeakingState = 0;

        for (const e of this.leadingBuffer) {
          if (startOptions.onSpeech) {
            startOptions.onSpeech(e.audio, this.chunk, e.frame);
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
      this.consecutiveNonSpeakingState = 0;

      // stream all speech audio
      if (startOptions.onSpeech) {
        startOptions.onSpeech(audio, this.chunk, this.frame);
      }

      // we're no longer speaking
      if (this.consecutiveVADNonSpeech == this.trailingSilenceThreshold) {
        this.speaking = false;
      }
    }

    for (const trigger of this.triggers) {
      if (this.audioStarted && this.consecutiveNonSpeakingState == trigger.threshold) {
        startOptions.onTrigger(trigger);
      }
    }

    this.frame++;
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

  reset() {
    this.audioStarted = false;
    this.consecutiveNonSpeakingState = 0;
    this.consecutiveVADNonSpeech = 0;
    this.consecutiveVADSpeech = 0;
    this.speaking = false;
    this.leadingBuffer = [];
  }

  stop() {
    this.audioStream.stop();
    this.reset();
  }
}

export const getDevices = portAudioBindings.getDevices;
