import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { ReceiptStageTimings } from "./formatStageTimings";
import type { ScanTimelinePayload } from "@/lib/receipt-scan-timeline";

export type StoredParserPayload = {
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  rawVisionResponse?: string;
  performance?: ReceiptStageTimings;
  scanTimeline?: ScanTimelinePayload | null;
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
    };
  } catch {
    return null;
  }
}
