import type { ReceiptGraph } from "../types/models/graph";
import type { ClassifiedGraph } from "../types/models/classify";
import type { LayerResult, ReceiptEngineLayer } from "../types/layer";
import { createLayerMetrics } from "../types/layer";
import { clampConfidence, CONFIDENCE } from "../types/provenance";
import { buildClassifiedGraph } from "./buildClassifiedGraph";

export type Layer4Input = ReceiptGraph;
export type Layer4Output = ClassifiedGraph;

export const layer4Classify: ReceiptEngineLayer<Layer4Input, Layer4Output> = {
  id: "L4_CLASSIFY",

  async run(input, ctx): Promise<LayerResult<Layer4Output>> {
    void ctx;
    const output = buildClassifiedGraph(input);
    const hasNodes = output.nodes.length > 0;

    return {
      output,
      issues: [],
      metrics: createLayerMetrics(
        0,
        clampConfidence(hasNodes ? output.confidence : CONFIDENCE.none)
      ),
    };
  },
};
