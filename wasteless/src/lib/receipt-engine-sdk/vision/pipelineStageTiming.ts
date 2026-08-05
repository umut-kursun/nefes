/** Per-stage timings for the vision-first receipt pipeline (milliseconds). */

export type VisionPipelineStageTimings = {
  /** Client-side canvas preprocessing (contrast, crop, deskew, threshold). */
  preprocessMs?: number;
  /** Client-side resize to maxEdge. */
  resizeMs?: number;
  /** Client or server base64 / dataUrl encoding. */
  base64EncodeMs?: number;
  /** OpenAI chat/completions HTTP round-trip. */
  openAiRequestMs: number;
  /** JSON.parse + schema coerce after vision response. */
  jsonParseMs: number;
  /** normalizeVisionReceipt / finalizeVisionParsedReceipt. */
  normalizeVisionReceiptMs: number;
  /** parsedReceiptToPurchaseDraft. */
  purchaseDraftMs: number;
  /** buildValidationReport / validateReceiptTotal. */
  validationMs: number;
  totalMs: number;
};

export function createEmptyVisionStageTimings(): VisionPipelineStageTimings {
  return {
    openAiRequestMs: 0,
    jsonParseMs: 0,
    normalizeVisionReceiptMs: 0,
    purchaseDraftMs: 0,
    validationMs: 0,
    totalMs: 0,
  };
}

export function logVisionPipelineTimings(
  timings: VisionPipelineStageTimings,
  sourceHint?: string
): void {
  const label = sourceHint ? `[receipt-pipeline:${sourceHint}]` : "[receipt-pipeline]";
  const lines = [
    timings.preprocessMs != null
      ? `  image preprocessing: ${timings.preprocessMs}ms`
      : null,
    timings.resizeMs != null ? `  image resize: ${timings.resizeMs}ms` : null,
    timings.base64EncodeMs != null
      ? `  base64 encoding: ${timings.base64EncodeMs}ms`
      : null,
    `  OpenAI request: ${timings.openAiRequestMs}ms`,
    `  JSON parsing: ${timings.jsonParseMs}ms`,
    `  normalizeVisionReceipt: ${timings.normalizeVisionReceiptMs}ms`,
    `  purchase draft creation: ${timings.purchaseDraftMs}ms`,
    `  validation: ${timings.validationMs}ms`,
    `  total: ${timings.totalMs}ms`,
  ].filter((line): line is string => line != null);

  console.info(`${label} stage timings:\n${lines.join("\n")}`);
}
