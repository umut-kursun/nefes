import { TR_VAT_RATES, type ParsedReceipt, type ReceiptItem } from "../types/ParsedReceipt";

const INLINE_VAT_IN_NAME = /\s+%(\d{1,2})\b/;

function isTrVatRate(value: number): boolean {
  return (TR_VAT_RATES as readonly number[]).includes(value);
}

function stripInlineVatFromName(name: string): {
  name: string;
  vatRate: number | null;
} {
  const match = name.match(INLINE_VAT_IN_NAME);
  if (!match?.[1]) {
    return { name: name.trim(), vatRate: null };
  }
  const rate = Number(match[1]);
  if (!isTrVatRate(rate)) {
    return { name: name.trim(), vatRate: null };
  }
  const cleaned = name
    .replace(INLINE_VAT_IN_NAME, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { name: cleaned, vatRate: rate };
}

/**
 * When qty equals a TR VAT rate and lineTotal === unitPrice, `%10` was likely
 * parsed as quantity (Birinci Profiterol TATLI %10 *625,00).
 */
function vatRateFromMisreadQuantity(item: ReceiptItem): number | null {
  const qty = item.quantity ?? 1;
  if (!isTrVatRate(qty) || qty === 1) return null;

  const unit = item.unitPrice ?? item.lineTotal;
  if (Math.abs(unit - item.lineTotal) > 0.011) return null;

  const unitKind = (item.unit ?? "ad").toLowerCase();
  if (unitKind === "kg" || unitKind === "g") return null;

  return qty;
}

export function applyProductLineVatRate(item: ReceiptItem): ReceiptItem {
  let next: ReceiptItem = { ...item };

  const fromName = stripInlineVatFromName(next.name);
  if (fromName.vatRate != null) {
    next = {
      ...next,
      name: fromName.name,
      vatRatePercentage:
        next.vatRatePercentage ??
        (fromName.vatRate as ReceiptItem["vatRatePercentage"]),
    };
  }

  const misreadVat = vatRateFromMisreadQuantity(next);
  if (misreadVat != null && next.vatRatePercentage == null) {
    next = { ...next, vatRatePercentage: misreadVat as ReceiptItem["vatRatePercentage"] };
  }

  const vatRate = next.vatRatePercentage;
  if (
    vatRate != null &&
    (next.quantity ?? 1) === vatRate &&
    Math.abs((next.unitPrice ?? next.lineTotal) - next.lineTotal) <= 0.011
  ) {
    next = {
      ...next,
      quantity: 1,
      unit: next.unit ?? "ad",
      unitPrice: next.lineTotal,
    };
  }

  if (next.quantity !== null && (next.quantity === undefined || next.quantity <= 0)) {
    next = {
      ...next,
      quantity: 1,
      unit: next.unit ?? "ad",
      unitPrice: next.unitPrice ?? next.lineTotal,
    };
  }

  return next;
}

/** Map inline `%N` on product rows to vatRatePercentage; never use VAT as quantity. */
export function applyProductLineVatRates(parsed: ParsedReceipt): ParsedReceipt {
  return {
    ...parsed,
    products: parsed.products.map(applyProductLineVatRate),
  };
}
