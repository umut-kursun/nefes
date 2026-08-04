import { cleanProductName } from "@/lib/product-name-cleaner";
import type { ReceiptItem } from "../types/ParsedReceipt";

const TRAILING_UNIT_DESCRIPTOR =
  /\s+(?:ADET|AD|PCS|PC|EA|UNIT|PK|PAKET)\s*$/i;

const MULTIPLIER_LINE_IN_NAME =
  /^\d+(?:[.,]\d+)?\s+(?:AD|ADET|KG|G)\s+(?:[xX×]\s*)?\d/i;

/** Strip unit descriptors wrongly merged into product names; normalize display text. */
export function normalizeVisionProductItem(item: ReceiptItem): ReceiptItem {
  let name = item.name.trim();
  let unit = item.unit?.trim().toLowerCase() ?? null;

  if (TRAILING_UNIT_DESCRIPTOR.test(name)) {
    name = name.replace(TRAILING_UNIT_DESCRIPTOR, "").trim();
    unit = "adet";
  }

  const cleaned = cleanProductName(name);
  if (cleaned) name = cleaned;

  if (MULTIPLIER_LINE_IN_NAME.test(name)) {
    return item;
  }

  return {
    ...item,
    name: name || item.name.trim(),
    unit: unit ?? item.unit ?? null,
  };
}

export function normalizeVisionProductNames(
  products: readonly ReceiptItem[]
): ReceiptItem[] {
  return products.map(normalizeVisionProductItem);
}
