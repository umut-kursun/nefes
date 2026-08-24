import { parseTrNumber } from "@/lib/receipt-engine/layer-6-purchase/parsers/parseNumber";
import type { ParsedReceipt, ReceiptItem } from "../types/ParsedReceipt";
import { roundLineTotal } from "./parsedReceiptPostProcess";
import { parseMultiplierText } from "./mergeStandaloneMultiplierProducts";
import {
  isMigrosReceipt,
  migrosMultiplierMustPreserveQuantity,
  shouldPreserveExplicitMigrosQuantity,
} from "./migrosReceiptRules";
import {
  isCollapsedQuantityLine,
  lineTotalsMatch,
  multiplierMathMatchesLine,
} from "./multiplierBindingUtils";

/** Product row ending with printed line total, e.g. `LAKTOSUZ SÜT 200ML  *99.50`. */
const PRODUCT_LINE_WITH_TOTAL =
  /^(.+?)\s*\*+\s*(\d+(?:[.,]\d+)?)\s*$/;

/** Migros row with printed qty + total: `ALGIDA FRIGOLA 60ML *1 *360,00`. */
const PRODUCT_LINE_WITH_EXPLICIT_QTY =
  /^(.+?)\s*\*(\d{1,2})\s*\*+\s*(\d+(?:[.,]\d+)?)\s*$/;

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

function parseMultiplierLine(
  line: string
): Omit<UpperLineBinding, "nameHint" | "lineTotal"> | null {
  const parsed = parseMultiplierText(line);
  if (!parsed || Number.isNaN(parsed.unitPrice)) return null;
  return {
    quantity: parsed.quantity,
    unit: parsed.unit,
    unitPrice: parsed.unitPrice,
  };
}

function parseProductLine(line: string): { nameHint: string; lineTotal: number } | null {
  const trimmed = line.trim();
  const explicit = trimmed.match(PRODUCT_LINE_WITH_EXPLICIT_QTY);
  if (explicit?.[1] && explicit[3]) {
    const lineTotal = parseTrNumber(explicit[3]);
    const nameHint = explicit[1].trim();
    if (nameHint && lineTotal != null && lineTotal >= 0) {
      return { nameHint, lineTotal };
    }
  }

  const match = trimmed.match(PRODUCT_LINE_WITH_TOTAL);
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
  if (
    !multiplierMathMatchesLine(
      multiplier.quantity,
      multiplier.unitPrice,
      product.lineTotal
    )
  ) {
    return;
  }

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

function bindingImprovesItem(
  item: ReceiptItem,
  binding: UpperLineBinding,
  rawText: string | null | undefined
): boolean {
  const nameOk = namesMatch(item.name, binding.nameHint);
  const collapsed = isCollapsedQuantityLine(item);
  const lineOk = lineTotalsMatch(item.lineTotal, binding.lineTotal);

  if (!nameOk && !(collapsed && lineOk)) return false;

  if (rawText?.trim() && nameOk) {
    if (
      shouldPreserveExplicitMigrosQuantity(rawText, item.name, item.lineTotal)
    ) {
      return false;
    }
  }

  const bindingDelta = Math.abs(
    roundLineTotal(binding.quantity, binding.unitPrice) - binding.lineTotal
  );
  if (bindingDelta > 0.05) return false;

  const currentQty = item.quantity ?? 1;
  const currentUnit = item.unitPrice ?? item.lineTotal;
  const currentDelta = Math.abs(roundLineTotal(currentQty, currentUnit) - item.lineTotal);

  if (collapsed && lineOk && binding.quantity > 1) return true;

  if (nameOk) {
    if (
      currentQty === binding.quantity &&
      Math.abs(currentUnit - binding.unitPrice) <= 0.011 &&
      currentDelta <= 0.011
    ) {
      return false;
    }
    return binding.quantity > 1 || bindingDelta <= currentDelta;
  }

  if (currentDelta <= 0.011) {
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

function bindProductsToBindings(
  parsed: ParsedReceipt,
  bindings: readonly UpperLineBinding[]
): ReceiptItem[] {
  const rawText = parsed.rawText;
  const migros = isMigrosReceipt(parsed);
  const products = parsed.products;
  const usedBindings = new Set<number>();
  const updated = products.map((item) => ({ ...item }));

  // Pass 1: name + lineTotal (document order).
  for (let p = 0; p < updated.length; p++) {
    for (let b = 0; b < bindings.length; b++) {
      if (usedBindings.has(b)) continue;
      if (!namesMatch(updated[p]!.name, bindings[b]!.nameHint)) continue;
      if (!bindingImprovesItem(updated[p]!, bindings[b]!, rawText)) continue;
      if (migros && migrosMultiplierMustPreserveQuantity(parsed, updated[p]!)) {
        continue;
      }
      updated[p] = applyBinding(updated[p]!, bindings[b]!);
      usedBindings.add(b);
      break;
    }
  }

  // Pass 2: unique lineTotal match for collapsed rows (name drift / OCR mismatch).
  for (let b = 0; b < bindings.length; b++) {
    if (usedBindings.has(b)) continue;
    const binding = bindings[b]!;
    const candidates: number[] = [];
    for (let p = 0; p < updated.length; p++) {
      if (!lineTotalsMatch(updated[p]!.lineTotal, binding.lineTotal)) continue;
      if (!isCollapsedQuantityLine(updated[p]!)) continue;
      if (!bindingImprovesItem(updated[p]!, binding, rawText)) continue;
      candidates.push(p);
    }
    if (candidates.length !== 1) continue;
    const idx = candidates[0]!;
    if (migros && migrosMultiplierMustPreserveQuantity(parsed, updated[idx]!)) {
      continue;
    }
    updated[idx] = applyBinding(updated[idx]!, binding);
    usedBindings.add(b);
  }

  return updated;
}

/**
 * When rawText is present, bind `{N} ad|kg X {PRICE}` lines to product rows.
 */
export function bindUpperLineQuantities(parsed: ParsedReceipt): ParsedReceipt {
  if (!parsed.rawText?.trim()) return parsed;

  const bindings = extractUpperLineBindings(parsed.rawText);
  if (bindings.length === 0) return parsed;

  return {
    ...parsed,
    products: bindProductsToBindings(parsed, bindings),
  };
}
