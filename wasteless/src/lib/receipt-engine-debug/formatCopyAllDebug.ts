import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { ReceiptEngineV2Result } from "@/lib/receipt-engine-v2/engine/types";
import { formatStageDebugReport, formatValidationSummary } from "@/lib/receipt-engine-v2/debug/formatStageDebugReport";
import type { ReceiptStageTimings } from "./formatStageTimings";
import type { ScanTimelinePayload } from "@/lib/receipt-scan-timeline";

function section(title: string): string {
  return `\n==================== ${title} ====================\n`;
}

function padIndex(index: number): string {
  return `[${String(index).padStart(2, "0")}]`;
}

function formatAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function formatPerformanceSummary(timings?: ReceiptStageTimings): string {
  const lines = [section("PERFORMANCE").trimEnd(), ""];

  if (!timings) {
    lines.push("(no timing data)");
    return lines.join("\n");
  }

  if (timings.engine) {
    lines.push(`engine     : ${timings.engine}`);
  }

  const rows: Array<[string, number | undefined]> = [
    ["OCR", timings.ocrMs ?? timings.openAiRequestMs],
    ["JSON parse", timings.jsonParseMs],
    ["Purchase draft", timings.purchaseDraftMs ?? timings.purchaseMs],
    ["Validation", timings.validationMs],
    ["Network", timings.networkMs],
    ["Preprocess", timings.preprocessMs],
    ["Total", timings.clientTotalMs ?? timings.totalMs],
  ];

  for (const [label, ms] of rows) {
    if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) continue;
    const sec = ms >= 1000 ? ` (${(ms / 1000).toFixed(1)} s)` : "";
    lines.push(`${label.padEnd(11)}: ${Math.round(ms)} ms${sec}`);
  }

  if (lines.length === 2) {
    lines.push("(no timing data)");
  }

  return lines.join("\n");
}

function formatLegacyDebugReport(options: {
  ocr: string;
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  stageTimings?: ReceiptStageTimings;
  engineUsed?: "v1" | "v2";
  engineFallback?: boolean;
}): string {
  const ocrLines = options.ocr
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line, index) => `${padIndex(index)} ${line}`)
    .join("\n");

  const purchaseLines = [
    section("PURCHASE").trimEnd(),
    "",
    `merchant : ${options.purchase.merchant ?? "-"}`,
    `products : ${options.purchase.products?.length ?? 0}`,
    `total    : ${formatAmount(options.purchase.total?.amount)}`,
  ];

  if (options.engineUsed) {
    purchaseLines.push(`engine   : ${options.engineUsed}`);
  }
  if (options.engineFallback) {
    purchaseLines.push("fallback : yes (v2 failed)");
  }

  return [
    section("OCR").trimEnd(),
    "",
    ocrLines || "(empty)",
    purchaseLines.join("\n"),
    formatValidationSummary(options.validation),
    formatPerformanceSummary(options.stageTimings),
  ].join("\n");
}

export function formatCopyAllDebug(options: {
  ocr: string;
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  engineResult?: ReceiptEngineV2Result;
  stageTimings?: ReceiptStageTimings;
  scanTimeline?: ScanTimelinePayload | null;
  engineUsed?: "v1" | "v2";
  engineFallback?: boolean;
  /** @deprecated Ignored — kept for call-site compatibility. */
  rawVision?: string;
  /** @deprecated Ignored — kept for call-site compatibility. */
  analyzeResult?: unknown;
  /** @deprecated Ignored — kept for call-site compatibility. */
  parserJson?: string;
}): string {
  if (options.engineResult) {
    return formatStageDebugReport({
      engineResult: options.engineResult,
      validation: options.validation,
      stageTimings: options.stageTimings,
    });
  }

  return formatLegacyDebugReport({
    ocr: options.ocr,
    purchase: options.purchase,
    validation: options.validation,
    stageTimings: options.stageTimings,
    engineUsed: options.engineUsed,
    engineFallback: options.engineFallback,
  });
}

/** @deprecated Use formatCopyAllDebug */
export const formatCopyEverythingBundle = formatCopyAllDebug;
