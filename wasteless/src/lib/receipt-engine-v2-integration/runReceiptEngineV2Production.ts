import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import { stripValidatedPurchase } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ReceiptStageTimings } from "@/lib/receipt-engine-debug/formatStageTimings";
import { runReceiptEngineV2 } from "@/lib/receipt-engine-v2/engine/runReceiptEngineV2";
import { readReceiptWithVisionOcr } from "@/lib/receipt-engine-v2/vision/openAiVisionOcrProvider";
import type { ReceiptEngineV2Result } from "@/lib/receipt-engine-v2/engine/types";
import type { ScanTimeline } from "@/lib/receipt-scan-timeline";
import { stampTimeline } from "@/lib/receipt-scan-timeline";
import { v2PurchaseToPurchaseDraft } from "./v2PurchaseToPurchaseDraft";

/** Re-run V1 full pipeline when V2 validation score is below this threshold. */
export const V2_VALIDATION_FALLBACK_THRESHOLD = 60;

export type RunReceiptEngineV2ProductionInput = {
  readonly imageDataUrl: string;
  readonly altImageDataUrl?: string;
  readonly apiKey: string;
  readonly model?: string;
  readonly scanTimeline?: ScanTimeline;
};

export type RunReceiptEngineV2ProductionResult = {
  readonly purchase: PurchaseDraft;
  readonly validation: ValidationReportGolden;
  readonly ocrRawText: string;
  readonly rawVisionResponse: string;
  readonly performance: ReceiptStageTimings;
  readonly engineResult: ReceiptEngineV2Result;
};

export async function runReceiptEngineV2Production(
  input: RunReceiptEngineV2ProductionInput
): Promise<RunReceiptEngineV2ProductionResult> {
  const pipelineStart = Date.now();
  const scanTimeline = input.scanTimeline;

  if (scanTimeline) {
    stampTimeline(scanTimeline, "t5_openai_request_start");
  }

  const visionRun = await readReceiptWithVisionOcr(
    {
      imageDataUrl: input.imageDataUrl,
      altImageDataUrl: input.altImageDataUrl,
    },
    {
      apiKey: input.apiKey,
      model: input.model ?? process.env.OPENAI_OCR_MODEL ?? "gpt-4o-mini",
    }
  );

  if (scanTimeline) {
    stampTimeline(scanTimeline, "t6_openai_first_byte");
    stampTimeline(scanTimeline, "t7_openai_response_complete");
  }

  const engineResult = runReceiptEngineV2(visionRun.result);

  const purchase = v2PurchaseToPurchaseDraft(
    engineResult.purchase,
    engineResult.rawVision,
    engineResult.receiptDocument
  );
  const validationStart = Date.now();
  const validationReport = buildValidationReport(purchase);
  const validationMs = Date.now() - validationStart;
  const validation = stripValidatedPurchase({
    ...validationReport,
    validatedPurchase: purchase,
  });

  const performance: ReceiptStageTimings = {
    ocrMs: visionRun.openAiRequestMs,
    openAiRequestMs: visionRun.openAiRequestMs,
    jsonParseMs: visionRun.jsonParseMs,
    extractionMs: engineResult.receiptDocument.extractionMs,
    validationMs,
    purchaseDraftMs:
      Date.now() -
      pipelineStart -
      visionRun.openAiRequestMs -
      visionRun.jsonParseMs -
      validationMs,
    totalMs: Date.now() - pipelineStart,
    engine: "v2",
  };

  return {
    purchase,
    validation,
    ocrRawText: engineResult.rawVision.rawText,
    rawVisionResponse: visionRun.rawVisionResponse,
    performance,
    engineResult,
  };
}
