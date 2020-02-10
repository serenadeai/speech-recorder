const assert = require('assert');
const { SpeechRecorder } = require("../dist/index");

class FakeVad {
    nextProcessResult = false;

    process() {
        return this.nextProcessResult;
    }
}

describe('SpeechRecorder', function() {
    describe('SpeechRecorder', function() {
        it('Detects speech starting and ending with correct buffer counting', function() {
            const recorder = new SpeechRecorder({
                silence: 3,
                skip: 1,
                smoothing: 2,
            });

            recorder.vad = new FakeVad();

            let onSpeechCallbackCount = 0;

            const sendFrame = function(isSpeech) {
                recorder.vad.nextProcessResult = isSpeech;
                recorder.onData({
                    onSpeech: function(data, chunk) {
                        onSpeechCallbackCount += 1;
                    }
                });
            };

            // Needs 2 consecutive speech frames to be in speaking mode
            sendFrame(true);
            assert.strictEqual(recorder.speaking, false);
            assert.deepEqual(recorder.results, [true]);

            sendFrame(true);
            assert.strictEqual(recorder.speaking, true);
            assert.deepEqual(recorder.results, [true, true]);
            assert.strictEqual(recorder.audioStarted, true);
            // Both frames should be pushed
            assert.strictEqual(onSpeechCallbackCount, 2);

            sendFrame(true);
            assert.strictEqual(recorder.speaking, true);
            assert.deepEqual(recorder.results, [true, true]);
            assert.strictEqual(onSpeechCallbackCount, 3);

            // Still in speaking mode for 3 frames of silence
            sendFrame(false);
            assert.strictEqual(recorder.speaking, true);
            assert.deepEqual(recorder.results, [true, false]);
            assert.strictEqual(onSpeechCallbackCount, 4);

            sendFrame(false);
            assert.strictEqual(recorder.speaking, true);
            assert.deepEqual(recorder.results, [false, false]);
            assert.strictEqual(onSpeechCallbackCount, 5);

            sendFrame(false);
            assert.strictEqual(recorder.speaking, false);
            assert.deepEqual(recorder.results, [false, false]);
            assert.strictEqual(onSpeechCallbackCount, 6);

            // Another frame of silence should not be pushed
            sendFrame(false);
            assert.strictEqual(recorder.speaking, false);
            assert.deepEqual(recorder.results, [false, false]);
            assert.strictEqual(onSpeechCallbackCount, 6);
        });
    });
});
