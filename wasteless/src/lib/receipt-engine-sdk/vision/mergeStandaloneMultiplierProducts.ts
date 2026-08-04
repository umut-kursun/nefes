import { parseTrNumber } from "@/lib/receipt-engine/layer-6-purchase/parsers/parseNumber";
import type { ParsedReceipt, ReceiptItem } from "../types/ParsedReceipt";
import { roundLineTotal } from "./parsedReceiptPostProcess";

/** Full multiplier: `3 AD x 25,90 TL/AD` or `5.59 kg X 19.50`. */
export const FULL_MULTIPLIER_LINE =
  /^(\d+(?:[.,]\d+)?)\s+(ad|adet|kg|g)\s+[xX×]\s+(\d+(?:[.,]\d+)?)(?:\s*(?:TL(?:\/(?:AD|KG))?)?)?\s*$/i;

/** Loose multiplier name only: `3 AD`, `9 adet`. */
const LOOSE_AD_MULTIPLIER =
  /^(\d+(?:[.,]\d+)?)\s+(?:ad|adet)\s*$/i;

export type ParsedMultiplier = {
  quantity: number;
  unit: string;
  unitPrice: number;
};

export function parseMultiplierText(text: string): ParsedMultiplier | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const full = trimmed.match(FULL_MULTIPLIER_LINE);
  if (full?.[1] && full[2] && full[3]) {
    const quantity = parseTrNumber(full[1]);
    const unitPrice = parseTrNumber(full[3]);
    if (quantity == null || quantity <= 0 || unitPrice == null || unitPrice < 0) {
      return null;
    }
    let unit = full[2]!.toLocaleLowerCase("tr-TR");
    if (unit === "adet") unit = "ad";
    if (unit === "g") unit = "kg";
    return { quantity, unit, unitPrice };
  }

  const loose = trimmed.match(LOOSE_AD_MULTIPLIER);
  if (loose?.[1]) {
    const quantity = parseTrNumber(loose[1]);
    if (quantity == null || quantity <= 0) return null;
    return { quantity, unit: "ad", unitPrice: NaN };
  }

  return null;
}

/** True when the LLM emitted a standalone multiplier row as a product line. */
export function isStandaloneMultiplierProduct(item: ReceiptItem): boolean {
  const name = item.name.trim();
  if (!name) return false;

  if (parseMultiplierText(name)) return true;
  if (/TL\/AD/i.test(name)) return true;
  if (/^\d+(?:[.,]\d+)?\s*AD\b/i.test(name)) return true;
  if (/^\d+(?:[.,]\d+)?\s+(?:kg|g)\s+[xX×]/i.test(name)) return true;

  return false;
}

function resolveUnitPrice(
  parsed: ParsedMultiplier,
  item: ReceiptItem
): number | null {
  if (!Number.isNaN(parsed.unitPrice) && parsed.unitPrice >= 0) {
    return parsed.unitPrice;
  }
  if (item.unitPrice != null && item.unitPrice >= 0) return item.unitPrice;

  const qty = item.quantity ?? parsed.quantity;
  if (qty > 0 && item.lineTotal > 0) {
    const inferred = item.lineTotal / qty;
    if (Math.abs(roundLineTotal(parsed.quantity, inferred) - item.lineTotal) <= 0.05) {
      return inferred;
    }
    if (parsed.quantity > 1 && item.lineTotal < parsed.quantity * 100) {
      return item.lineTotal;
    }
  }

  return null;
}

function multiplierFromItem(item: ReceiptItem): ParsedMultiplier | null {
  const fromName = parseMultiplierText(item.name);
  if (!fromName) return null;

  const unitPrice = resolveUnitPrice(fromName, item);
  if (unitPrice == null || unitPrice < 0) return null;

  return {
    quantity: fromName.quantity,
    unit: fromName.unit,
    unitPrice,
  };
}

function bindingMatchesProduct(
  product: ReceiptItem,
  multiplier: ParsedMultiplier
): boolean {
  const expected = roundLineTotal(multiplier.quantity, multiplier.unitPrice);
  return Math.abs(expected - product.lineTotal) <= 0.05;
}

function applyMultiplierToProduct(
  product: ReceiptItem,
  multiplier: ParsedMultiplier
): ReceiptItem {
  return {
    ...product,
    quantity: multiplier.quantity,
    unit: multiplier.unit,
    unitPrice: multiplier.unitPrice,
    lineTotal: product.lineTotal,
  };
}

/**
 * When the vision LLM outputs multiplier lines as separate products[] rows,
 * merge qty/unitPrice into the adjacent real product and drop the phantom row.
 */
export function mergeStandaloneMultiplierProducts(
  parsed: ParsedReceipt
): ParsedReceipt {
  const products = parsed.products;
  if (products.length < 2) return parsed;

  const remove = new Set<number>();
  const updated = products.map((item) => ({ ...item }));

  for (let i = 0; i < products.length; i++) {
    if (remove.has(i)) continue;

    const item = products[i]!;
    if (!isStandaloneMultiplierProduct(item)) continue;

    const multiplier = multiplierFromItem(item);
    if (!multiplier) continue;

    const prev = i > 0 ? updated[i - 1] : null;
    const next = i < products.length - 1 ? updated[i + 1] : null;

    const prevMatch =
      prev && !remove.has(i - 1) && !isStandaloneMultiplierProduct(prev)
        ? bindingMatchesProduct(prev, multiplier)
        : false;
    const nextMatch =
      next && !remove.has(i + 1) && !isStandaloneMultiplierProduct(next)
        ? bindingMatchesProduct(next, multiplier)
        : false;

    let targetIdx: number | null = null;
    if (prevMatch && !nextMatch) targetIdx = i - 1;
    else if (nextMatch && !prevMatch) targetIdx = i + 1;
    else if (prevMatch && nextMatch) {
      // Multiplier-below (Migros): bind to preceding product only.
      targetIdx = i - 1;
    }

    if (targetIdx == null) continue;

    updated[targetIdx] = applyMultiplierToProduct(updated[targetIdx]!, multiplier);
    remove.add(i);
  }

  if (remove.size === 0) return parsed;

  return {
    ...parsed,
    products: updated.filter((_, idx) => !remove.has(idx)),
  };
}
