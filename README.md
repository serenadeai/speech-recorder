# speech-recorder

speech-recorder is a cross-platform, native [node.js](https://nodejs.org) [addon](http://nodejs.org/api/addons.html) for getting a stream of audio from a device's microphone. Using speech-recorder, you can also get only the audio that corresponds to someone speaking.

This module is used for speech recognition in [Serenade](https://serenade.ai). Serenade enables you to write code through natural speech, rather than typing.

## Installation

speech-recorder has been tested on Windows 10, macOS 10.14+, and Ubuntu 18.04+ (and may work on other platforms as well).

To install speech-recorder, run:

    yarn add speech-recorder

If you're using this library with Electron, you should probably use [electron-rebuild](https://github.com/electron/electron-rebuild).

## Usage

This library uses two voice activity detection mechanisms: a fast first pass (the WebRTC VAD), and a slightly slower, but much more accurate, second pass (the Silero VAD). See below for the various options you can supply to each.

### Devices

You can get a list of supported devices with:

    import { getDevices } from "speech-recorder";

    console.log(getDevices());

### Streaming

You can write all audio to a file with:

    import { SpeechRecorder } from "speech-recorder";

    const recorder = new SpeechRecorder();
    const writeStream = fs.createWriteStream("audio.raw");

    recorder.start({
      onAudio: (audio) => {
        writeStream.write(audio);
      }
    });

Or, just the speech with:

    import { SpeechRecorder } from "speech-recorder";

    const recorder = new SpeechRecorder({ framesPerBuffer: 320 });
    const writeStream = fs.createWriteStream("audio.raw");

    recorder.start({
      onAudio: (audio, speech) => {
        if (speech) {
          writeStream.write(audio);
        }
      }
    });

### Options

The `SpeechRecorder` constructor supports the following options:

- `disableSecondPass`: whether or not to disable the second pass. defaults to `false`.
- `error`: callback called on audio stream error. defaults to `null`.
- `framesPerBuffer`: the number of audio frames to read at a time. defaults to `320`.
- `highWaterMark`: the `highWaterMark` to be applied to the underlying stream, or how much audio can be buffered in memory. defaults to `64000` (64kb).
- `leadingPadding`: the number of frames to buffer at the start of a speech chunk. this can be prevent audio at the start of the file from getting cut off. defaults to `20`.
- `firstPassFilter`: the level of aggressiveness for the first-pass filter on a scale of 0-3, with 0 being the least aggressive and 3 being the most aggressive. defaults to `3`.
- `minimumVolume`: a minimum volume threshold for speech.
- `speakingThreshold`: the number of consecutive speaking frames before considering speech to have started. defaults to `1`.
- `silenceThreshold`: the number of consecutive non-speaking buffers before considering speech to be finished. defaults to `10`.
- `triggers`: a list of `Trigger` objects that can optionally specify when the `onTrigger` callback is executed.
- `vadBufferSize`: the number of buffers to pass to the second-pass VAD. i.e., the number of frames passed to the VAD is `framesPerBuffer * vadBufferSize`.
- `vadThreshold`: the probability cutoff, between 0–1, for the second-pass VAD. defaults to `0.75`. e.g., a value of `0.9` will only consider a buffer to be speech if the VAD is 90% confident.

The `start` method supports the following options:

- `deviceId`: `id` value from `getDevices` corresponding to the device you want to use; a value of `-1` uses the default device.
- `onAudio`: a callback to be executed when audio data is received from the mic. will be passed `(audio, speaking, speech, volume, silence)`, where `audio` is the buffer of audio data, `speaking` is whether or not we're in the speaking state, `speech` is whether the current frame is speech (recall that consecutive non-speaking frames must be found to exit the speaking state, so `speaking` and `speech` can be different), `volume` is the volume of the audio, and `silence` is the number of consecutive silence frames that have been heard.
- `onChunkStart`: a callback to be executed when a speech chunk starts. will be passed the leading buffer, whose size is determined by `leadingPadding`.
- `onChunkEnd`: a callback to be executed when a speech chunk ends.
- `onTrigger`: a callback to be executed when a trigger threshold is met.

### Examples

See the `examples/` directory for example usages.

## Credits

- speech-recorder uses [PortAudio](http://portaudio.com/) for native microphone access.
- speech-recorder uses [webrtcvad](https://github.com/serenadeai/webrtcvad) as a first-pass filter for voice detection.
- speech-recorder users [silero-vad](https://github.com/snakers4/silero-vad) for detecting voice.
- speech-recorder is based on [node-portaudio](https://github.com/auroraapi/node-portaudio), which in turn is based on [naudiodon](https://github.com/Streampunk/naudiodon).
