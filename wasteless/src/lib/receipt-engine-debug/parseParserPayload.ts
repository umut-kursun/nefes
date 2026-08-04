import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";

export type StoredParserPayload = {
  purchase: PurchaseDraft;
  validation: ValidationReportGolden;
  rawVisionResponse?: string;
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
    };
    if (!parsed.purchase || !parsed.validation) return null;
    return {
      purchase: parsed.purchase,
      validation: parsed.validation,
      rawVisionResponse:
        typeof parsed.rawVisionResponse === "string"
          ? parsed.rawVisionResponse
          : undefined,
    };
  } catch {
    return null;
  }
}
