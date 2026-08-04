import type { ParsedReceipt, ReceiptItem } from "../types/ParsedReceipt";

import { roundLineTotal } from "./parsedReceiptPostProcess";

import {

  PARSED_RECEIPT_TOTAL_TOLERANCE,

  validateParsedReceiptMath,

} from "./parsedReceiptValidation";



export function sumProductLineTotals(products: readonly ReceiptItem[]): number {

  const sum = products.reduce((acc, p) => acc + p.lineTotal, 0);

  return Math.round(sum * 100) / 100;

}



function lineMathDelta(item: ReceiptItem): number {

  const qty = item.quantity ?? 1;

  const unit = item.unitPrice ?? item.lineTotal;

  if (qty <= 0 || unit <= 0) return 0;

  return Math.abs(roundLineTotal(qty, unit) - item.lineTotal);

}



/**

 * Fix invented bulk quantities (e.g. 20 ad × 7.20 or 10 ad × 6.50) when printed

 * lineTotal is authoritative but qty×unitPrice does not match.

 */

export function sanitizeHallucinatedQuantities(item: ReceiptItem): ReceiptItem {

  const qty = item.quantity ?? 1;

  const unitPrice = item.unitPrice ?? item.lineTotal;

  const lineTotal = item.lineTotal;

  const unit = item.unit?.trim().toLowerCase() ?? null;
  const isWeight = unit === "kg" || unit === "g";



  // Collapse invented bulk piece counts (10 ad, 20 ad) even when qty×unitPrice = lineTotal.

  if (

    !isWeight &&

    Number.isInteger(qty) &&

    qty >= 10 &&

    unitPrice > 0 &&

    lineTotal > unitPrice * 2 &&

    Math.abs(roundLineTotal(qty, unitPrice) - lineTotal) <= 0.05

  ) {

    return { ...item, quantity: 1, unit: "ad", unitPrice: lineTotal };

  }



  const delta = lineMathDelta(item);



  if (delta <= 0.05) return item;



  if (isWeight && unitPrice > 0) {

    const impliedQty = Math.round((lineTotal / unitPrice) * 1000) / 1000;

    if (

      Math.abs(roundLineTotal(impliedQty, unitPrice) - lineTotal) <= 0.05 &&

      Math.abs(impliedQty - qty) > 0.01

    ) {

      return { ...item, quantity: impliedQty, unit: "kg", unitPrice };

    }

  }



  if (

    !isWeight &&

    Number.isInteger(qty) &&

    qty >= 2 &&

    delta > 0.5

  ) {

    return {

      ...item,

      quantity: 1,

      unit: "ad",

      unitPrice: lineTotal,

    };

  }



  if (delta > 0.5 && unitPrice > 0 && qty > 0) {

    return {

      ...item,

      quantity: isWeight

        ? Math.round((lineTotal / unitPrice) * 1000) / 1000

        : 1,

      unit: isWeight ? "kg" : "ad",

      unitPrice: isWeight ? unitPrice : lineTotal,

    };

  }



  return item;

}



/** Re-calculate each line from quantity × unitPrice when both are present. */

export function recalculateLineTotals(

  products: readonly ReceiptItem[]

): ReceiptItem[] {

  return products.map((item) => {

    const qty = item.quantity;

    const unit = item.unitPrice;

    if (qty == null || qty <= 0 || unit == null || unit <= 0) return item;



    const recalculated = roundLineTotal(qty, unit);

    const delta = Math.abs(recalculated - item.lineTotal);

    if (delta <= 0.011) return item;

    if (delta < 0.05) return item;

    return { ...item, lineTotal: recalculated };

  });

}



/**

 * Sanitize qty/unit only — never mutate line totals to force SUM = grand total.

 * Returns mathConsistent=false when product sum diverges from receipt total.

 */

export function reconcileParsedReceiptTotals(

  parsed: ParsedReceipt

): ParsedReceipt {

  const products = parsed.products.map(sanitizeHallucinatedQuantities);

  const math = validateParsedReceiptMath(

    { ...parsed, products },

    PARSED_RECEIPT_TOTAL_TOLERANCE

  );



  return {

    ...parsed,

    products,

    mathConsistent: math.ok,

  };

}



/** Infer measure unit when vision provides it explicitly. */
export function inferReceiptItemUnit(item: ReceiptItem): string | null {
  if (item.unit?.trim()) return item.unit.trim().toLowerCase();
  const qty = item.quantity;
  if (qty != null && qty > 0 && qty < 50 && !Number.isInteger(qty)) return "kg";
  return null;
}

