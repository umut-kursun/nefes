import type { ImageBundle, OcrDocument } from "../types/models/image";
import type { LayerResult, ReceiptEngineLayer } from "../types/layer";
import { createLayerMetrics } from "../types/layer";
import { clampConfidence, CONFIDENCE } from "../types/provenance";
import { normalizeOcrExtractOutput } from "./normalizeOcrDocument";

export type Layer1Input = ImageBundle;
export type Layer1Output = OcrDocument;

export const layer1Ocr: ReceiptEngineLayer<Layer1Input, Layer1Output> = {
  id: "L1_OCR",

  async run(input, ctx): Promise<LayerResult<Layer1Output>> {
    const provider = ctx.deps.ocrProvider;
    const extracted = await provider.extract({
      imageDataUrl: input.primary.dataUrl,
      altImageDataUrl: input.alt?.dataUrl,
      fixtureKey: input.meta.fixtureKey,
    });
    const output = normalizeOcrExtractOutput(extracted);

    return {
      output,
      issues: [],
      metrics: createLayerMetrics(
        0,
        clampConfidence(output.quality.score || CONFIDENCE.none)
      ),
    };
  },
};
