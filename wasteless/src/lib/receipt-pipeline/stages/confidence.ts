import type { AnalysisItem, AnalysisResult } from "@/lib/types";
import { normalizeKey } from "@/lib/merchants";
import { checkReceiptConsistency } from "@/lib/receipt-quality";

export const ITEM_CONFIRM_THRESHOLD = 0.75;

export type ConfidenceResult = {
  analysis: AnalysisResult;
  items: AnalysisItem[];
  notes: string[];
};

function linePriceConfidence(item: AnalysisItem): number {
  let score = 0.85;
  const price = item.totalPrice;
  if (price == null || price <= 0) score -= 0.35;
  if (item.quantity != null && item.quantity > 0 && item.unitPrice != null) {
    score += 0.05;
  }
  return Math.max(0.1, Math.min(0.99, score));
}

function nameConfidence(item: AnalysisItem): number {
  const ocr = (item.ocrName ?? item.name ?? "").trim();
  const name = (item.name ?? "").trim();
  if (!ocr || !name) return 0.5;
  if (normalizeKey(ocr) === normalizeKey(name)) return 0.92;
  // Reconstructed name — higher when length grew (expanded abbreviations)
  if (name.length > ocr.length * 1.1) return 0.88;
  if (name.length >= ocr.length * 0.85) return 0.78;
  return 0.62;
}

/**
 * Stage 7 — per-product confidence. Only low-confidence lines need user confirmation.
 */
export function applyConfidenceScoring(
  analysis: AnalysisResult
): ConfidenceResult {
  const notes: string[] = [];
  const consistency = checkReceiptConsistency(
    analysis.items,
    analysis.totalAmount,
    analysis.charges,
    analysis.discounts
  );

  let receiptConfidence = analysis.confidence ?? 0.7;
  if (consistency.inconsistent) {
    receiptConfidence = Math.min(receiptConfidence, 0.5);
  } else if (!consistency.inconsistent && consistency.itemsSum > 0) {
    receiptConfidence = Math.max(receiptConfidence, 0.85);
  }

  const items = (analysis.items ?? []).map((item) => {
    const nameScore = nameConfidence(item);
    const priceScore = linePriceConfidence(item);
    const confidence =
      Math.round((nameScore * 0.65 + priceScore * 0.35) * 100) / 100;
    return {
      ...item,
      confidence: Math.max(0.1, Math.min(0.99, confidence)),
    };
  });

  const lowCount = items.filter(
    (i) => (i.confidence ?? 1) < ITEM_CONFIRM_THRESHOLD
  ).length;
  if (lowCount > 0) {
    notes.push(`${lowCount} ürün düşük güven — kontrol önerilir.`);
  }

  const itemAvg =
    items.length > 0
      ? items.reduce((s, i) => s + (i.confidence ?? 0.5), 0) / items.length
      : receiptConfidence;

  const blended = Math.round((receiptConfidence * 0.4 + itemAvg * 0.6) * 100) / 100;

  return {
    analysis: { ...analysis, confidence: blended },
    items,
    notes,
  };
}

export function itemNeedsConfirmation(item: AnalysisItem): boolean {
  return (item.confidence ?? 1) < ITEM_CONFIRM_THRESHOLD;
}
