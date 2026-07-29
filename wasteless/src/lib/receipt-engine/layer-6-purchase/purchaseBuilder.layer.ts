import type { BlockDocument } from "../types/models/blocks";
import type { PurchaseDraft } from "../types/models/purchase";
import type {
  LayerResult,
  ReceiptEngineLayer,
} from "../types/layer";
import { createLayerMetrics } from "../types/layer";
import { buildPurchaseDraft } from "./buildPurchaseDraft";

export interface Layer6Input {
  blocks: BlockDocument;
}

export type Layer6Output = PurchaseDraft;

export const layer6Purchase: ReceiptEngineLayer<Layer6Input, Layer6Output> = {
  id: "L6_PURCHASE",

  async run(input, ctx): Promise<LayerResult<Layer6Output>> {
    void ctx;
    const output = buildPurchaseDraft(input.blocks);
    return {
      output,
      issues: [],
      metrics: createLayerMetrics(0, output.confidence),
    };
  },
};
