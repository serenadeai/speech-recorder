# speech-recorder

speech-recorder is a cross-platform, native [node.js](https://nodejs.org) [addon](http://nodejs.org/api/addons.html) for getting a stream of audio from a device's microphone. Using speech-recorder, you can also get only the audio that corresponds to someone speaking.

This module is used for speech recognition in [Serenade](https://serenade.ai). Serenade enables you to write code through natural speech, rather than typing.

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

    const recorder = new SpeechRecorder({ sampleRate: 16000, framesPerBuffer: 320 });
    const writeStream = fs.createWriteStream("audio.raw");

    recorder.start({
      onSpeech: (audio, chunk) => {
        writeStream.write(audio);
      }
    });

As you can see, `onSpeech` will be called whenever speech is detected, and `onAudio` will be called regardless (i.e., on every frame).

The `SpeechRecorder` constructor supports the following options:

-   `error`: callback called on audio stream error. defaults to `null`.
-   `framesPerBuffer`: the number of audio frames to read at a time. defaults to `160`.
-   `highWaterMark`: the `highWaterMark` to be applied to the underlying stream, or how much audio can be buffered in memory. defaults to `32000` (32kb).
-   `level`: the VAD aggressiveness level on a scale of 0-3, with 0 being the least aggressive and 3 being the most aggressive.
-   `padding`: the number of non-speaking frames to be given to the `onSpeech` callback before speech starts; this can be useful if you want some silence at the start of each speech block. defaults to `10`.
-   `sampleRate`: the sample rate for the audio; must be 8000, 16000, 32000, or 48000. defaults to `16000`.
-   `silence`: the number of consecutive non-speaking frames before silence is detected (taking into account the `smoothing` factor).
-   `smoothing`: the number of consecutive frames of the same type before making a transition. for instance, if `smoothing` is `2`, then a single frame will not be counted as speech; only when `2` consecutive speech frames are detected will speech be detected. defaults to `2`.
-   `skip`: the number of initial frames to skip before considering audio as speech, to allow for initial VAD calibration*__*.
-   `triggers`: a list of `Trigger` objects that can optionally specify when the `onTrigger` callback is executed.

The `start` method supports the following options:

-   `deviceId`: `id` value from `getDevices` corresponding to the device you want to use; a value of `-1` uses the default device.
-   `onAudio`: a callback to be executed for all frames of audio data.
-   `onSpeech`: a callback to be executed only for speaking frames of audio data.
-   `onTrigger`: a callback to be executed when a trigger threshold is met.

### Examples

See the `examples/` directory for example usages.

## Credits

-   speech-recorder uses [PortAudio](http://portaudio.com/) for native microphone access.
-   speech-recorder uses [webrtcvad](https://github.com/serenadeai/webrtcvad) for detecting voice.
-   speech-recorder is based on [node-portaudio](https://github.com/auroraapi/node-portaudio), which in turn is based on [naudiodon](https://github.com/Streampunk/naudiodon).
