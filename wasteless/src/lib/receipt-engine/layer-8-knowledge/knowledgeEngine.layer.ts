import type { PurchaseDraft } from "../types/models/purchase";
import type { ValidationReport } from "../types/models/validation";
import type { EnrichedPurchase } from "../types/models/knowledge";
import type {
  LayerResult,
  ReceiptEngineLayer,
} from "../types/layer";
import { createLayerMetrics } from "../types/layer";
import { createLayerStubIssue } from "../types/issues";
import { CONFIDENCE } from "../types/provenance";

export interface Layer8Input {
  purchase: PurchaseDraft;
  validation: ValidationReport;
}

export type Layer8Output = EnrichedPurchase;

export const layer8Knowledge: ReceiptEngineLayer<Layer8Input, Layer8Output> = {
  id: "L8_KNOWLEDGE",

  async run(input, ctx): Promise<LayerResult<Layer8Output>> {
    void ctx.deps.knowledgeContext;
    return {
      output: {
        ...input.purchase,
        knowledgeNotes: [],
        matchStats: { matched: 0, unknown: 0, aiNormalized: 0 },
      },
      issues: [createLayerStubIssue("L8_KNOWLEDGE")],
      metrics: createLayerMetrics(0, CONFIDENCE.none),
    };
  },
};
