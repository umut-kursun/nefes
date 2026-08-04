import type { ParsedReceipt } from "../types/ParsedReceipt";
import { roundLineTotal } from "./parsedReceiptPostProcess";

export const PARSED_RECEIPT_TOTAL_TOLERANCE = 0.5;
export const PARSED_RECEIPT_LINE_TOLERANCE = 0.01;

export function sumParsedReceiptLineTotals(parsed: ParsedReceipt): number {
  const productSum = parsed.products.reduce((acc, item) => acc + item.lineTotal, 0);
  const chargeSum = (parsed.platformCharges ?? []).reduce(
    (acc, c) => acc + c.amount,
    0
  );
  const discountSum = (parsed.discounts ?? []).reduce(
    (acc, d) => acc + Math.abs(d.amount),
    0
  );
  return Math.round((productSum + chargeSum - discountSum) * 100) / 100;
}

export interface ParsedReceiptMathCheck {
  readonly ok: boolean;
  readonly itemSum: number;
  readonly total: number;
  readonly delta: number;
}

export interface ParsedReceiptLineItemCheck {
  readonly index: number;
  readonly name: string;
  readonly quantity: number | null | undefined;
  readonly unitPrice: number | undefined;
  readonly expectedLineTotal: number;
  readonly actualLineTotal: number;
  readonly ok: boolean;
}

/** Verify each lineTotal equals round(quantity × unitPrice, 2) when both are present. */
export function validateParsedReceiptLineItems(
  parsed: ParsedReceipt,
  tolerance = PARSED_RECEIPT_LINE_TOLERANCE
): ParsedReceiptLineItemCheck[] {
  return parsed.products.map((item, index) => {
    const qty = item.quantity;
    const unit = item.unitPrice;
    if (qty == null || qty <= 0 || unit == null || unit < 0) {
      return Object.freeze({
        index,
        name: item.name,
        quantity: qty,
        unitPrice: unit,
        expectedLineTotal: item.lineTotal,
        actualLineTotal: item.lineTotal,
        ok: true,
      });
    }
    const expected = roundLineTotal(qty, unit);
    const isWeighted =
      item.unit === "kg" ||
      item.unit === "g" ||
      (qty > 0 && qty < 50 && !Number.isInteger(qty));
    const lineTolerance = isWeighted ? 0.05 : tolerance;
    const ok = Math.abs(expected - item.lineTotal) <= lineTolerance;
    return Object.freeze({
      index,
      name: item.name,
      quantity: qty,
      unitPrice: unit,
      expectedLineTotal: expected,
      actualLineTotal: item.lineTotal,
      ok,
    });
  });
}

export function hasLineItemMathErrors(
  checks: readonly ParsedReceiptLineItemCheck[]
): boolean {
  return checks.some((c) => !c.ok);
}

/** Verify product line totals match declared grand total (±tolerance TL). */
export function validateParsedReceiptMath(
  parsed: ParsedReceipt,
  tolerance = PARSED_RECEIPT_TOTAL_TOLERANCE
): ParsedReceiptMathCheck {
  const itemSum = sumParsedReceiptLineTotals(parsed);
  const total = parsed.financials.totalAmount;
  const delta = Math.abs(itemSum - total);
  return Object.freeze({
    ok: delta <= tolerance,
    itemSum,
    total,
    delta: Math.round(delta * 100) / 100,
  });
}

export function buildVisionRetryInstruction(
  itemSum: number,
  receiptTotal: number,
  lineErrors?: readonly ParsedReceiptLineItemCheck[]
): string {
  const failed = lineErrors?.filter((e) => !e.ok) ?? [];
  const parts = [
    `Previous items summed to ${itemSum.toFixed(2)} TL, but receipt total is ${receiptTotal.toFixed(2)} TL.`,
  ];

  if (failed.length > 0) {
    parts.push(
      "Line-item math errors (multiplier line likely shifted to wrong product):"
    );
    for (const err of failed) {
      parts.push(
        `- "${err.name}": lineTotal ${err.actualLineTotal.toFixed(2)} but quantity(${err.quantity}) × unitPrice(${err.unitPrice}) = ${err.expectedLineTotal.toFixed(2)}`
      );
    }
  }

  parts.push(
    "YOU HAVE SHIFTED A MULTIPLIER LINE OR MISREAD A DECIMAL.",
    "Re-align multiplier lines using spatial proximity:",
    "PATTERN A — multiplier ABOVE product: bind Line 1 (e.g. '2 ad X 37.50') to Line 2 product name with *lineTotal.",
    "PATTERN B — multiplier BELOW product: bind Line 2 (e.g. '0.744 kg X 89.90') to Line 1 product name with *lineTotal.",
    "Never assign a multiplier to a product that already has *lineTotal on its own row.",
    "lineTotal MUST equal round(quantity × unitPrice, 2) — e.g. NEKTARIN 0.744×89.90=66.89, BAGET 2×37.50=75.00.",
    `Re-scan until SUM(lineTotal) equals exactly ${receiptTotal.toFixed(2)}.`
  );

  return parts.join(" ");
}
