import type { LayoutDocument } from "../types/models/layout";
import type { ReceiptGraph } from "../types/models/graph";
import type { LayerResult, ReceiptEngineLayer } from "../types/layer";
import { createLayerMetrics } from "../types/layer";
import { clampConfidence, CONFIDENCE } from "../types/provenance";
import { buildReceiptGraph } from "./buildReceiptGraph";

export type Layer3Input = LayoutDocument;
export type Layer3Output = ReceiptGraph;

export const layer3Graph: ReceiptEngineLayer<Layer3Input, Layer3Output> = {
  id: "L3_GRAPH",

  async run(input, ctx): Promise<LayerResult<Layer3Output>> {
    void ctx;
    const output = buildReceiptGraph(input);
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
