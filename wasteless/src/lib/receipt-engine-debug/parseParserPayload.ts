import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { ReceiptEngineV2Result } from "@/lib/receipt-engine-v2/engine/types";
import type { ReceiptStageTimings } from "./formatStageTimings";
import type { ScanTimelinePayload } from "@/lib/receipt-scan-timeline";

export type StoredParserPayload = {
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  rawVisionResponse?: string;
  performance?: ReceiptStageTimings;
  scanTimeline?: ScanTimelinePayload | null;
  engineResult?: ReceiptEngineV2Result;
  engineUsed?: "v1" | "v2";
  engineFallback?: boolean;
};

export function parseStoredParserPayload(
  raw: string | null | undefined
): StoredParserPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as {
      purchase?: PurchaseDraft;
      validation?: ValidationReportGolden;
      rawVisionResponse?: string;
      performance?: ReceiptStageTimings;
      scanTimeline?: ScanTimelinePayload | null;
      engineResult?: ReceiptEngineV2Result;
      engineUsed?: "v1" | "v2";
      engineFallback?: boolean;
    };
    if (!parsed.purchase || !parsed.validation) return null;
    return {
      purchase: parsed.purchase,
      validation: parsed.validation,
      rawVisionResponse:
        typeof parsed.rawVisionResponse === "string"
          ? parsed.rawVisionResponse
          : undefined,
      performance:
        parsed.performance && typeof parsed.performance === "object"
          ? parsed.performance
          : undefined,
      scanTimeline:
        parsed.scanTimeline && typeof parsed.scanTimeline === "object"
          ? parsed.scanTimeline
          : undefined,
      engineResult:
        parsed.engineResult && typeof parsed.engineResult === "object"
          ? parsed.engineResult
          : undefined,
      engineUsed:
        parsed.engineUsed === "v1" || parsed.engineUsed === "v2"
          ? parsed.engineUsed
          : undefined,
      engineFallback:
        typeof parsed.engineFallback === "boolean"
          ? parsed.engineFallback
          : undefined,
    };
  } catch {
    return null;
  }
}
