# speech-recorder

speech-recorder is a cross-platform, native [node.js](https://nodejs.org) [addon](http://nodejs.org/api/addons.html) for getting a stream of audio from a device's microphone. Using speech-recorder, you can also get only the audio that corresponds to someone speaking.

## Installation

speech-recorder has been tested on Windows 10, macOS 10.14+, and Ubuntu 18.04+ (and may work on other platforms as well).

To install speech-recorder, run:

    yarn add speech-recorder

If you're using this library with Electron, you should probably use [electron-rebuild](https://github.com/electron/electron-rebuild).

## Usage

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

    const recorder = new SpeechRecorder();
    const writeStream = fs.createWriteStream("audio.raw");

    recorder.start({
      onSpeech: (audio) => {
        writeStream.write(audio);
      }
    });

The `SpeechRecorder` constructor supports the following options:

-   `error`: callback called on audio stream error.
-   `framesPerBuffer`: the number of audio frames to read at a time.
-   `highWaterMark`: the `highWaterMark` to be applied to the underlying stream, or how much audio can be buffered in memory.
-   `leadingPadding`: the number of non-speaking frames to be given to the `onSpeech` callback before speech starts; this can be useful if you want some silence at the start of each speech block, or the voice activity detector starts too late.
-   `nonSpeakingThreshold`: the number of consecutive frames of non-speech before the current block of speech frames finishes.
-   `sampleRate`: the sample rate for the audio; must be 8000, 16000, 32000, or 48000.
-   `trailingPadding`: the number of non-speaking frames to be given to the `onSpeech` callback after speech finishes; this can be useful if you want some silence at the end of each speech block, or the voice activity detector cuts off too early.

The `start` method supports the following options:

-   `deviceId`: `id` value from `getDevices` corresponding to the device you want to use; a value of `-1` uses the default device.
-   `onAudio`: a callback to be executed for all frames of audio data.
-   `onSpeech`: a callback to be executed only for speaking frames of audio data.

### Examples

See the `examples/` directory for example usages.

## Credits

-   speech-recorder uses [PortAudio](http://portaudio.com/) for native microphone access.
-   speech-recorder uses [webrtcvad](https://github.com/serenadeai/webrtcvad) for detecting voice.
-   speech-recorder is based on [node-portaudio](https://github.com/auroraapi/node-portaudio), which in turn is based on [naudiodon](https://github.com/Streampunk/naudiodon).
