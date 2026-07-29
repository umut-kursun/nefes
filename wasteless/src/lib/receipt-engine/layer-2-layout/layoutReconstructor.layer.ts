import type { OcrDocument } from "../types/models/image";
import type { LayoutDocument } from "../types/models/layout";
import type { LayerResult, ReceiptEngineLayer } from "../types/layer";
import { createLayerMetrics } from "../types/layer";
import { clampConfidence, CONFIDENCE } from "../types/provenance";
import { reconstructLayout } from "./layoutReconstructor";

export type Layer2Input = OcrDocument;
export type Layer2Output = LayoutDocument;

export const layer2Layout: ReceiptEngineLayer<Layer2Input, Layer2Output> = {
  id: "L2_LAYOUT",

  async run(input, ctx): Promise<LayerResult<Layer2Output>> {
    const profile = ctx.deps.layoutProfiles.resolve(input.rawText);
    const output = reconstructLayout(input, profile.id);
    const hasLines = output.lines.length > 0;

    return {
      output,
      issues: [],
      metrics: createLayerMetrics(
        0,
        clampConfidence(hasLines ? output.confidence : CONFIDENCE.none)
      ),
    };
  },
};
