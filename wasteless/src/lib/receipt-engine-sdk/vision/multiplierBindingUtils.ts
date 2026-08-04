import type { ReceiptItem } from "../types/ParsedReceipt";
import { roundLineTotal } from "./parsedReceiptPostProcess";

export const LINE_TOTAL_TOLERANCE = 0.05;

export function lineTotalsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= LINE_TOTAL_TOLERANCE;
}

/** Vision collapsed qty=1 rows where unitPrice was copied from lineTotal. */
export function isCollapsedQuantityLine(item: ReceiptItem): boolean {
  const qty = item.quantity ?? 1;
  const unit = item.unitPrice ?? item.lineTotal;
  if (qty > 1) return false;
  return lineTotalsMatch(unit, item.lineTotal);
}

export function multiplierMathMatchesLine(
  quantity: number,
  unitPrice: number,
  lineTotal: number
): boolean {
  if (quantity <= 0 || unitPrice <= 0) return false;
  return lineTotalsMatch(roundLineTotal(quantity, unitPrice), lineTotal);
}
