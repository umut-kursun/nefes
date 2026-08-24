import { LineKind } from "../../tokenizer/LineKind";
import type { TokenizedLine } from "../../tokenizer/TokenizedLine";
import type { VisionResult } from "../../vision/types";
import type { VisionLineKind, VisionOcrExtract } from "@/lib/receipt-engine-sdk/vision/visionOcrExtract";

const FOOTER_KINDS: ReadonlySet<LineKind> = new Set([
  LineKind.Subtotal,
  LineKind.VatTotal,
  LineKind.GrandTotal,
  LineKind.PaymentHeader,
  LineKind.PaymentAmount,
  LineKind.Footer,
]);

function tokenKindToVisionKind(kind: LineKind, raw: string): VisionLineKind | null {
  if (/^\s*\([^)]+\)\s*$/.test(raw)) return "component";

  switch (kind) {
    case LineKind.ProductCandidate:
      return "product";
    case LineKind.QuantityDetail:
      return "quantity";
    case LineKind.DiscountCandidate:
      return "discount";
    case LineKind.ChargeCandidate:
      return "charge";
    default:
      return null;
  }
}

function inferCategory(family: string): VisionOcrExtract["merchant"]["category"] {
  switch (family) {
    case "supermarket":
      return "MARKET";
    case "fuel":
      return "FUEL";
    case "pharmacy":
      return "PHARMACY";
    case "retail":
      return "RETAIL";
    case "fast_food":
    case "restaurant":
      return "RESTAURANT";
    default:
      return "OTHER";
  }
}

/** Build a VisionOcrExtract from V2 VisionResult + tokenizer output for SDK fallback. */
export function visionResultToOcrExtract(
  vision: VisionResult,
  tokens: readonly TokenizedLine[],
  layoutFamily = "generic"
): VisionOcrExtract {
  const productLines: VisionOcrExtract["productLines"] = [];
  const footerLines: string[] = [];
  const paymentLines: string[] = [];

  for (const token of tokens) {
    if (FOOTER_KINDS.has(token.kind)) {
      if (
        token.kind === LineKind.PaymentHeader ||
        token.kind === LineKind.PaymentAmount
      ) {
        paymentLines.push(token.raw);
      } else {
        footerLines.push(token.raw);
      }
      continue;
    }

    const visionKind = tokenKindToVisionKind(token.kind, token.raw);
    if (visionKind) {
      productLines.push({ text: token.raw, kind: visionKind });
    }
  }

  return {
    merchant: {
      title: vision.merchant?.rawName?.trim() || vision.lines[0]?.trim() || "Unknown",
      category: inferCategory(layoutFamily),
    },
    metadata: {
      purchaseDate: vision.metadata?.purchaseDate ?? "1970-01-01",
      purchaseTime: vision.metadata?.purchaseTime ?? null,
      receiptNumber: vision.metadata?.receiptNumber ?? null,
      currency: vision.metadata?.currency ?? "TRY",
    },
    productLines,
    footerLines,
    paymentLines,
    rawText: vision.rawText,
    confidence: vision.confidence ?? 0.7,
  };
}
