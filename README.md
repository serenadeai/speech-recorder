# Speech Recorder

speech-recorder is a cross-platform, native [node.js](https://nodejs.org) [addon](http://nodejs.org/api/addons.html) for getting a stream of audio from a device's microphone. Using speech-recorder, you can also get only the audio that corresponds to someone speaking.

This module is used for speech recognition in [Serenade](https://serenade.ai). Serenade enables you to write code through natural speech, rather than typing.

## Installation

speech-recorder has been tested on Windows 10, macOS 10.14+, and Ubuntu 18.04+ (and may work on other platforms as well).

To install speech-recorder, run:

    yarn add speech-recorder

If you're using this library with Electron, you should probably use [electron-rebuild](https://github.com/electron/electron-rebuild).

## Usage

This library uses two voice activity detection mechanisms: a fast first pass (the WebRTC VAD), and a slightly slower, but much more accurate, second pass (the Silero VAD). See below for the various options you can supply to each.

### Streaming

When you start recording, you can register various callbacks. `onAudio` is called when any audio comes in from the microphone. `onChunkStart` is called when a chunk of speech begins, and `onChunkEnd` is called when speech ends.

    const { SpeechRecorder } = require("speech-recorder");

    const recorder = new SpeechRecorder({
      onChunkStart: ({ audio }) => {
        console.log(Date.now(), "Chunk start");
      },
      onAudio: ({ speaking, probability, volume }) => {
        console.log(Date.now(), speaking, probability, volume);
      },
      onChunkEnd: () => {
        console.log(Date.now(), "Chunk end");
      },
    });

    console.log("Recording for 5 seconds...");
    recorder.start();
    setTimeout(() => {
      console.log("Done!");
      recorder.stop();
    }, 5000);

You can write all audio from the microphone to a file with:

    const { SpeechRecorder } = require("speech-recorder");

    const writeStream = fs.createWriteStream("audio.raw");
    const recorder = new SpeechRecorder({
      onAudio: ({ audio }) => {
        writeStream.write(audio);
      }
    });

Or, just the speech with:

    const { SpeechRecorder } = require("speech-recorder");

    const writeStream = fs.createWriteStream("audio.raw");
    const recorder = new SpeechRecorder({
      onAudio: ({ audio, speech }) => {
        if (speech) {
          writeStream.write(audio);
        }
      }
    });

### Devices

You can get a list of supported devices with:

    const { SpeechRecorder } = require("speech-recorder");

    const recorder = new SpeechRecorder();
    console.log(recorder.getDevices());

### Options

* `consecutiveFramesForSilence`: How many frames of audio must be silent before `onChunkEnd` is fired. Default `10`.
* `consecutiveFramesForSpeaking`: How many frames of audio must be speech before `onChunkStart` is fired. Default `1`.
* `leadingBufferFrames`: How many frames of audio to keep in a buffer that's included in `onChunkStart`. Default `10`.
* `onChunkStart`: Callback to be executed when speech starts.
* `onAudio`: Callback to be executed when any audio comes in.
* `onChunkEnd`: Callback to be executed when speech ends.
* `samplesPerFrame`: How many audio samples to be included in each frame from the microphone. Default `480`.
* `sampleRate`: Audio sample rate. Default `16000`.
* `sileroVadBufferSize`: How many audio samples to pass to the VAD. Default `2000`.
* `sileroVadRateLimit`: Rate limit, in frames, for how frequently to call the VAD. Default `3`.
* `sileroVadSilenceThreshold`: Probability threshold for speech to transition to silence. Default `0.1`.
* `sileroVadSpeakingThreshold`: Probability threshold for silence to transition to speech. Default `0.3`.
* `webrtcVadLevel`: Aggressiveness for the first-pass VAD filter. `0` is least aggressive, and `3` is most aggressive. Default `3`.
* `webrtcVadBufferSize`: How many audio samples to pass to the first-pass VAD filter. Default `480`. Can only be `160`, `320`, or `480`.
* `webrtcVadResultsSize`: How many first-pass VAD filter results to keep in history. Default `10`.

## Building SpeechRecorder

If you want to build speech-recorder from source, then follow these instructions.

### PortAudio

Download PortAudio from http://files.portaudio.com/download.html using wget, not a web browser (or you might run into Mac security warnings). Build PortAudio using CMake:

    cd $PORTAUDIO_PATH
    mkdir dist install
    cd dist
    cmake \
        -DCMAKE_INSTALL_PREFIX=../install \
        -DCMAKE_OSX_ARCHITECTURES=x86_64 \
        -DCMAKE_OSX_DEPLOYMENT_TARGET=10.14 \
        ..
    cmake --build . --config Release
    cmake --install .
    cp -r ../install $SPEECH_RECORDER_PATH/lib/3rd_party/portaudio

### Onnx

#### Mac and Linux

Download onnxruntime from https://onnxruntime.ai. If you're on a Mac, use a tool like wget rather than a web browser, or you might run into some security warnings. Now, copy these files:

    cd $SPEECH_RECORDER_PATH
    cp -r onnxruntime lib/3rd_party/onnxruntime

#### Windows

Download onnxruntime from https://www.nuget.org/packages/Microsoft.ML.OnnxRuntime. Change the file extension fron .nupkg to .zip, then extract it. Now, copy these files:

    cd $SPEECH_RECORDER_PATH
    mkdir -p lib/3rd_party/onnxruntime/lib
    cp -r onnxruntime/build/native/include lib/3rd_party/onnxruntime
    cp onnxruntime/runtimes/win-x86/native/*.dll lib/3rd_party/onnxruntime/lib
    cp onnxruntime/runtimes/win-x86/native/*.lib lib/3rd_party/onnxruntime/lib

### speech-recorder

Now that everything is set up, you can run the below to build speech-recorder:

    yarn build

### Packaging

After speech-recorder is built, to create a prebuild package, run one of:

    yarn package:linux
    yarn package:mac
    yarn package:windows

Or, to build speech-recorder against the current architecture, run:

    yarn package

Keep in mind that the architecture of ONNX, PortAudio, and speech-recorder (see build.js) need to match.
