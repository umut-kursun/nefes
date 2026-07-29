import type { ReceiptEngineInput } from "../types/pipeline";
import type { ImageBundle } from "../types/models/image";
import { emptyImageBundle } from "../types/models/image";
import type {
  LayerResult,
  ReceiptEngineLayer,
} from "../types/layer";
import { createLayerMetrics } from "../types/layer";
import { createLayerStubIssue } from "../types/issues";
import { CONFIDENCE } from "../types/provenance";

export type Layer0Input = ReceiptEngineInput;
export type Layer0Output = ImageBundle;

export const layer0Image: ReceiptEngineLayer<Layer0Input, Layer0Output> = {
  id: "L0_IMAGE",

  async run(input, ctx): Promise<LayerResult<Layer0Output>> {
    void ctx;
    const bundle = emptyImageBundle(input.imagePrimary.dataUrl);
    if (input.imageAlt?.dataUrl) {
      bundle.alt = {
        dataUrl: input.imageAlt.dataUrl,
        variant: "threshold",
        width: input.imageAlt.width ?? 0,
        height: input.imageAlt.height ?? 0,
        preprocessMs: input.imageAlt.preprocessMs ?? 0,
      };
    }
    bundle.primary.preprocessMs = input.imagePrimary.preprocessMs ?? 0;
    bundle.primary.width = input.imagePrimary.width ?? 0;
    bundle.primary.height = input.imagePrimary.height ?? 0;

    return {
      output: bundle,
      issues: [createLayerStubIssue("L0_IMAGE")],
      metrics: createLayerMetrics(0, CONFIDENCE.none),
    };
  },
};
