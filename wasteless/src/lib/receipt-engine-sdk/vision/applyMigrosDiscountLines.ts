import { parseTrNumber } from "@/lib/receipt-engine/layer-6-purchase/parsers/parseNumber";
import type {
  DiscountInfo,
  ParsedReceipt,
  ReceiptItem,
} from "../types/ParsedReceipt";

const DISCOUNT_PRODUCT_NAME =
  /(?:^|\s)(?:%?\s*\d+\s*%\s*)?[İI]ND[İI]R[İI]M(?:\s|$)/i;
/** Migros inline discount under a product row, e.g. `% 25 % İNDİRİM %1 *-57,49`. */
const MIGROS_DISCOUNT_LINE =
  /%?\s*\d+\s*%\s*[İI]ND[İI]R[İI]M\s*%\s*\d+\s*\*+\s*-(\d+(?:[.,]\d+)?)/i;

const PRODUCT_LINE_WITH_TOTAL =
  /^(.+?)\s*\*+\s*(\d+(?:[.,]\d+)?)\s*$/;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDiscountAmount(line: string): number | null {
  const match = line.trim().match(MIGROS_DISCOUNT_LINE);
  if (!match?.[1]) return null;
  const amount = parseTrNumber(match[1]);
  return amount != null && amount > 0 ? amount : null;
}

function parseProductTotal(line: string): { nameHint: string; lineTotal: number } | null {
  const match = line.trim().match(PRODUCT_LINE_WITH_TOTAL);
  if (!match?.[1] || !match[2]) return null;
  const lineTotal = parseTrNumber(match[2]);
  const nameHint = match[1]!.trim();
  if (!nameHint || lineTotal == null || lineTotal <= 0) return null;
  return { nameHint, lineTotal };
}

function foldTurkishChars(value: string): string {
  return value
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c");
}

function normalizeNameKey(name: string): string {
  return foldTurkishChars(name)
    .replace(/[^a-z0-9]/gi, "")
    .toLocaleLowerCase("tr-TR");
}

function namesMatch(a: string, b: string): boolean {
  const ka = normalizeNameKey(a);
  const kb = normalizeNameKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (ka.length >= 4 && kb.includes(ka)) return true;
  if (kb.length >= 4 && ka.includes(kb)) return true;
  return false;
}

export type MigrosDiscountBinding = {
  readonly nameHint: string;
  readonly grossTotal: number;
  readonly discountAmount: number;
  readonly netTotal: number;
};

/** Scan raw OCR for product row followed by Migros discount line. */
export function extractMigrosDiscountBindings(rawText: string): MigrosDiscountBinding[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bindings: MigrosDiscountBinding[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const product = parseProductTotal(lines[i]!);
    if (!product) continue;

    const discountAmount = parseDiscountAmount(lines[i + 1]!);
    if (discountAmount == null) continue;

    const netTotal = roundMoney(product.lineTotal - discountAmount);
    if (netTotal < 0) continue;

    bindings.push({
      nameHint: product.nameHint,
      grossTotal: product.lineTotal,
      discountAmount,
      netTotal,
    });
  }

  return bindings;
}

function applyDiscount(item: ReceiptItem, binding: MigrosDiscountBinding): ReceiptItem {
  const qty = item.quantity ?? 1;
  const netTotal = binding.netTotal;
  const unitPrice =
    item.unitPrice != null && qty > 0
      ? roundMoney(netTotal / qty)
      : netTotal;

  return {
    ...item,
    lineTotal: netTotal,
    unitPrice,
  };
}

function isDiscountProduct(item: ReceiptItem): boolean {
  return DISCOUNT_PRODUCT_NAME.test(item.name);
}

function toDiscountEntry(item: ReceiptItem): DiscountInfo {
  return {
    name: item.name.trim() || "İNDİRİM",
    amount: Math.abs(item.lineTotal),
    linkedProductName: null,
  };
}

/**
 * When rawText contains Migros `% İNDİRİM` lines under product rows,
 * deduct the discount so line totals match the printed receipt total.
 * İNDİRİM rows misclassified as products[] move to discounts[].
 */
export function applyMigrosDiscountLines(parsed: ParsedReceipt): ParsedReceipt {
  const discountProducts = parsed.products.filter(isDiscountProduct);
  const products = parsed.products.filter((item) => !isDiscountProduct(item));
  const discounts: DiscountInfo[] = [
    ...(parsed.discounts ?? []),
    ...discountProducts.map(toDiscountEntry),
  ];

  const next: ParsedReceipt = {
    ...parsed,
    products,
    discounts,
  };

  if (!next.rawText?.trim()) return next;

  const bindings = extractMigrosDiscountBindings(next.rawText);
  if (bindings.length === 0) return next;

  const used = new Set<number>();
  const adjustedProducts = next.products.map((item) => {
    const idx = bindings.findIndex(
      (b, i) =>
        !used.has(i) &&
        namesMatch(item.name, b.nameHint) &&
        Math.abs(item.lineTotal - b.grossTotal) <= 0.5
    );
    if (idx < 0) return item;
    used.add(idx);
    const binding = bindings[idx]!;
    discounts.push({
      name: "İNDİRİM",
      amount: binding.discountAmount,
      linkedProductName: binding.nameHint,
    });
    return applyDiscount(item, binding);
  });

  return {
    ...next,
    products: adjustedProducts,
    discounts,
  };
}
