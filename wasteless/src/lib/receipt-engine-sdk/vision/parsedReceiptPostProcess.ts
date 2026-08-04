import type { ParsedReceipt, ReceiptItem } from "../types/ParsedReceipt";

/** Banker's rounding to 2 decimals — matches Turkish receipt line totals. */
export function roundLineTotal(quantity: number, unitPrice: number): number {
  return Number((quantity * unitPrice).toFixed(2));
}

function correctLineItem(item: ReceiptItem): ReceiptItem {
  const qty = item.quantity;
  const unit = item.unitPrice;
  if (qty == null || qty <= 0 || unit == null || unit < 0) return item;

  const recalculated = roundLineTotal(qty, unit);
  const delta = Math.abs(recalculated - item.lineTotal);

  // Already consistent within 1 kuruş.
  if (delta <= 0.011) return item;

  // Weighted produce: receipt may round differently (109.01 vs 109.02) — trust printed *total.
  if (delta < 0.05) return item;

  // Fix obvious float truncation (66.8 → 66.89) or large misreads.
  return { ...item, lineTotal: recalculated };
}

/**
 * Re-calculate lineTotal from quantity × unitPrice to fix float truncation
 * (e.g. 0.744 × 89.90 → 66.89, not 66.8).
 */
export function postProcessParsedReceipt(parsed: ParsedReceipt): ParsedReceipt {
  return {
    ...parsed,
    products: parsed.products.map(correctLineItem),
  };
}
