const ort = require("onnxruntime");

export default class SileroVad {
  private loaded = false;
  private session: any;

  private async load() {
    if (this.loaded) {
      return;
    }

    this.session = await ort.InferenceSession.create(`${__dirname}/../model/silero.onnx`);
    this.loaded = true;
  }

  async process(audio: number[], batchSize = 1): Promise<number> {
    await this.load();
    const result = await this.session.run({
      input: new ort.Tensor(Float32Array.from(audio), [batchSize, audio.length / batchSize]),
    });

    return result.output.data[1];
  }
}
