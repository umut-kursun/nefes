import { parseTrNumber } from "@/lib/receipt-engine/layer-6-purchase/parsers/parseNumber";
import type { ParsedReceipt, ReceiptItem } from "../types/ParsedReceipt";
import { roundLineTotal } from "./parsedReceiptPostProcess";
import { parseMultiplierText } from "./mergeStandaloneMultiplierProducts";
/** Product row ending with printed line total, e.g. `LAKTOSUZ SÜT 200ML  *99.50`. */
const PRODUCT_LINE_WITH_TOTAL =
  /^(.+?)\s*\*+\s*(\d+(?:[.,]\d+)?)\s*$/;

export type UpperLineBinding = {
  readonly nameHint: string;
  readonly quantity: number;
  readonly unit: string;
  readonly unitPrice: number;
  readonly lineTotal: number;
};

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
  const stripped = name.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, "");
  return foldTurkishChars(stripped.toLocaleLowerCase("tr-TR"));
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

function parseMultiplierLine(line: string): Omit<UpperLineBinding, "nameHint" | "lineTotal"> | null {
  const parsed = parseMultiplierText(line);
  if (!parsed || Number.isNaN(parsed.unitPrice)) return null;
  return {
    quantity: parsed.quantity,
    unit: parsed.unit,
    unitPrice: parsed.unitPrice,
  };
}
function parseProductLine(line: string): { nameHint: string; lineTotal: number } | null {
  const match = line.trim().match(PRODUCT_LINE_WITH_TOTAL);
  if (!match) return null;

  const lineTotal = parseTrNumber(match[2]!);
  const nameHint = match[1]!.trim();
  if (!nameHint || lineTotal == null || lineTotal < 0) return null;

  return { nameHint, lineTotal };
}

function pushBinding(
  bindings: UpperLineBinding[],
  product: { nameHint: string; lineTotal: number },
  multiplier: Omit<UpperLineBinding, "nameHint" | "lineTotal">
): void {
  const expected = roundLineTotal(multiplier.quantity, multiplier.unitPrice);
  const delta = Math.abs(expected - product.lineTotal);
  if (delta > 0.05) return;

  bindings.push({
    nameHint: product.nameHint,
    quantity: multiplier.quantity,
    unit: multiplier.unit,
    unitPrice: multiplier.unitPrice,
    lineTotal: product.lineTotal,
  });
}

/** Scan raw OCR lines for multiplier above OR below product rows (File/Migros layout). */
export function extractUpperLineBindings(rawText: string): UpperLineBinding[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bindings: UpperLineBinding[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const multiplierAbove = parseMultiplierLine(lines[i]!);
    if (multiplierAbove) {
      const product = parseProductLine(lines[i + 1]!);
      if (product) pushBinding(bindings, product, multiplierAbove);
    }

    const productAbove = parseProductLine(lines[i]!);
    const multiplierBelow = parseMultiplierLine(lines[i + 1]!);
    if (productAbove && multiplierBelow) {
      pushBinding(bindings, productAbove, multiplierBelow);
    }
  }

  return bindings;
}

function bindingImprovesItem(item: ReceiptItem, binding: UpperLineBinding): boolean {
  if (!namesMatch(item.name, binding.nameHint)) return false;

  const currentQty = item.quantity ?? 1;
  const currentUnit = item.unitPrice ?? item.lineTotal;
  const currentDelta = Math.abs(roundLineTotal(currentQty, currentUnit) - item.lineTotal);
  const bindingDelta = Math.abs(
    roundLineTotal(binding.quantity, binding.unitPrice) - item.lineTotal
  );
  const bindingMatchesPrintedTotal =
    Math.abs(binding.lineTotal - item.lineTotal) <= 0.5;

  if (!bindingMatchesPrintedTotal && bindingDelta > 0.05) return false;

  if (currentDelta <= 0.011) {
    // Already math-consistent — still apply when qty/unit split differs from OCR binding.
    return (
      currentQty !== binding.quantity ||
      Math.abs(currentUnit - binding.unitPrice) > 0.011 ||
      (item.unit ?? "ad").toLowerCase() !== binding.unit
    );
  }

  return bindingDelta <= currentDelta;
}

function applyBinding(item: ReceiptItem, binding: UpperLineBinding): ReceiptItem {
  return {
    ...item,
    quantity: binding.quantity,
    unit: binding.unit,
    unitPrice: binding.unitPrice,
    lineTotal: binding.lineTotal,
  };
}

/**
 * When rawText is present, bind `{N} ad|kg X {PRICE}` lines directly above product rows.
 */
export function bindUpperLineQuantities(parsed: ParsedReceipt): ParsedReceipt {
  if (!parsed.rawText?.trim()) return parsed;

  const bindings = extractUpperLineBindings(parsed.rawText);
  if (bindings.length === 0) return parsed;

  const used = new Set<number>();
  const products = parsed.products.map((item) => {
    for (let i = 0; i < bindings.length; i++) {
      if (used.has(i)) continue;
      if (bindingImprovesItem(item, bindings[i]!)) {
        used.add(i);
        return applyBinding(item, bindings[i]!);
      }
    }
    return item;
  });

  return { ...parsed, products };
}
