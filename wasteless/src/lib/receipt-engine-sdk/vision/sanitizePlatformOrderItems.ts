import type { ParsedReceipt, ParsedReceiptCharge, ReceiptItem } from "../types/ParsedReceipt";

const TR_VAT_STANDALONE = new Set(["1", "8", "10", "18", "20"]);

const DELIVERY_CHARGE =
  /\b(nakliye\s*ücreti|teslimat\s*ücreti|kurye\s*ücreti|delivery\s*fee|service\s*fee)\b/i;

const PLATFORM_MARKERS =
  /\b(migros\s*hemen|yemeksepeti|getir|trendyol\s*yemek)\b/i;

export type SanitizedPlatformReceipt = {
  readonly products: ReceiptItem[];
  readonly charges: ParsedReceiptCharge[];
};

/** True when token is a standalone VAT rate column (1, 10, 20), not part of a product name. */
export function isStandaloneVatToken(token: string): boolean {
  const t = token.trim().replace(/^%+|%+$/g, "").replace(",", ".");
  if (!t) return false;
  if (!/^\d+(?:\.\d+)?$/.test(t)) return false;
  const normalized = String(Math.round(Number(t)));
  return TR_VAT_STANDALONE.has(normalized);
}

/** Remove VAT column tokens and table noise from digital order item names. */
export function stripVatPercentTokens(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const next = parts[i + 1];

    if (isStandaloneVatToken(part)) {
      // "1" before a price column is usually quantity, not VAT.
      if (part === "1" && next && /^\d+(?:[.,]\d+)?$/.test(next)) {
        out.push(part);
      }
      continue;
    }

    out.push(part);
  }

  let s = out.join(" ");
  s = s.replace(/\s+%\s*\d{1,2}(?:[.,]\d+)?\b/g, " ");
  s = s.replace(/\b(?:x|X)\s*(?:1|8|10|18|20)\b/g, " ");
  s = s.replace(/\s*\*+\s*$/g, " ");
  s = s.replace(/\s{2,}/g, " ").trim();

  return s;
}

function isDeliveryCharge(name: string): boolean {
  return DELIVERY_CHARGE.test(name);
}

function looksLikePlatformReceipt(parsed: ParsedReceipt): boolean {
  const blob = [
    parsed.merchant.title,
    parsed.rawText ?? "",
    ...parsed.products.map((p) => p.name),
  ]
    .join("\n")
    .toLocaleLowerCase("tr-TR");

  return PLATFORM_MARKERS.test(blob);
}

function cleanProduct(item: ReceiptItem): ReceiptItem {
  const name = stripVatPercentTokens(item.name);
  if (name === item.name) return item;
  return { ...item, name: name || item.name };
}

/**
 * Split digital platform order rows into products vs delivery/service charges.
 * Strips standalone VAT tokens from item names.
 */
export function sanitizePlatformOrderItems(
  parsed: ParsedReceipt
): SanitizedPlatformReceipt {
  const products: ReceiptItem[] = [];
  const charges: ParsedReceiptCharge[] = [];

  const platform = looksLikePlatformReceipt(parsed);

  for (const item of parsed.products) {
    const cleaned = cleanProduct(item);
    const label = cleaned.name.trim();

    if (platform && isDeliveryCharge(label)) {
      charges.push({
        name: label,
        amount: cleaned.lineTotal,
        quantity: cleaned.quantity,
      });
      continue;
    }

    products.push(cleaned);
  }

  return { products, charges };
}

/** Apply platform sanitization back onto ParsedReceipt (charges kept for adapter). */
export function applyPlatformOrderSanitization(parsed: ParsedReceipt): ParsedReceipt {
  const { products, charges } = sanitizePlatformOrderItems(parsed);
  if (charges.length === 0 && products.every((p, i) => p === parsed.products[i])) {
    return parsed;
  }
  return {
    ...parsed,
    products,
    platformCharges: charges,
  };
}
