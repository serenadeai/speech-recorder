export default class SileroVad {
  private loaded = false;
  private ort: any;
  private session: any;

  public ready = false;

  async load() {
    if (this.loaded) {
      return;
    }

    this.loaded = true;
    try {
      this.ort = require("onnxruntime");
    } catch (e) {
      return;
    }

    if (!this.ort) {
      return;
    }

    try {
      this.session = await this.ort.InferenceSession.create(`${__dirname}/../model/silero.onnx`);
    } catch (e) {
      return;
    }

    if (!this.session) {
      return;
    }

    this.ready = true;
  }

  async process(audio: number[], batchSize = 1): Promise<number> {
    if (!this.loaded) {
      await this.load();
    }

    if (!this.ready) {
      return 0;
    }

    const result = await this.session.run({
      input: new this.ort.Tensor(Float32Array.from(audio), [batchSize, audio.length / batchSize]),
    });

    return result.output.data[1];
  }
}
