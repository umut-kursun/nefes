import type { ClassifiedGraph } from "../types/models/classify";
import type { BlockDocument } from "../types/models/blocks";
import type { LayerResult, ReceiptEngineLayer } from "../types/layer";
import { createLayerMetrics } from "../types/layer";
import { clampConfidence, CONFIDENCE } from "../types/provenance";
import { buildBlockDocument } from "./buildBlockDocument";

export type Layer5Input = ClassifiedGraph;
export type Layer5Output = BlockDocument;

export const layer5Blocks: ReceiptEngineLayer<Layer5Input, Layer5Output> = {
  id: "L5_BLOCKS",

  async run(input, ctx): Promise<LayerResult<Layer5Output>> {
    void ctx;
    const output = buildBlockDocument(input);
    const hasBlocks =
      output.products.length > 0 ||
      output.footer.nodeRefs.length > 0 ||
      output.metadata.nodeRefs.length > 0;

    return {
      output,
      issues: [],
      metrics: createLayerMetrics(
        0,
        clampConfidence(hasBlocks ? output.confidence : CONFIDENCE.none)
      ),
    };
  },
};
