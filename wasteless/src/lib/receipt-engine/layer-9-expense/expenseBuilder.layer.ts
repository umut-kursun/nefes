import type { Expense } from "@/lib/types";
import type { EnrichedPurchase } from "../types/models/knowledge";
import type { ValidationReport } from "../types/models/validation";
import type { ReceiptEngineInput } from "../types/pipeline";
import type {
  LayerResult,
  ReceiptEngineLayer,
} from "../types/layer";
import { createLayerMetrics } from "../types/layer";
import { createLayerStubIssue } from "../types/issues";
import { CONFIDENCE } from "../types/provenance";

export interface Layer9Input {
  purchase: EnrichedPurchase;
  validation: ValidationReport;
  engineInput: ReceiptEngineInput;
}

export type Layer9Output = Expense;

function emptyStubExpense(
  engineInput: ReceiptEngineInput,
  purchase: EnrichedPurchase
): Expense {
  const now = new Date().toISOString();
  const ocrRawText =
    purchase.provenance.rawTexts.filter(Boolean).join("\n").trim() ||
    engineInput.sourceHint ||
    null;
  return {
    id: "stub-exp-v2",
    sourceType: "receipt",
    date: now.slice(0, 10),
    time: null,
    merchantName: purchase.merchant,
    merchantRaw: purchase.merchant,
    category: "other",
    subcategory: null,
    tagIds: [],
    totalAmount: purchase.total?.amount ?? 0,
    currency: "TRY",
    notes: null,
    createdAt: now,
    updatedAt: now,
    rawText: ocrRawText,
    confidence: purchase.confidence ?? 0,
    imageDataUrl: engineInput.imageDataUrl ?? engineInput.imagePrimary.dataUrl,
    aiResponseJson: engineInput.aiResponseJson ?? null,
    fuel: null,
    packCount: purchase.products.length || null,
    quickButtonId: null,
    items: [],
    charges: [],
    discounts: [],
    payments: [],
    unknownLines: [],
  };
}

export const layer9Expense: ReceiptEngineLayer<Layer9Input, Layer9Output> = {
  id: "L9_EXPENSE",

  async run(input, ctx): Promise<LayerResult<Layer9Output>> {
    void ctx;
    return {
      output: emptyStubExpense(input.engineInput, input.purchase),
      issues: [createLayerStubIssue("L9_EXPENSE")],
      metrics: createLayerMetrics(0, CONFIDENCE.none),
    };
  },
};
