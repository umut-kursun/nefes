import { parseTrNumber } from "@/lib/receipt-engine/layer-6-purchase/parsers/parseNumber";
import { TR_VAT_RATES, type ParsedReceipt, type ReceiptItem } from "../types/ParsedReceipt";
import { roundLineTotal } from "./parsedReceiptPostProcess";

/**
 * POS thermal lines: `NAME *QTY *TOTAL` or `*QTY *TOTAL`.
 * Distinct from VAT lines like `TATLI %10 *625,00` (uses `%`, single amount asterisk).
 */
const POS_ASTERISK_QTY_LINE =
  /^(.*?)\s*\*(\d+(?:[.,]\d+)?)\s+\*(\d+(?:[.,]\d+)?)\s*$/;

export type PosLineBinding = {
  readonly nameHint: string;
  readonly quantity: number;
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

function isTrVatRate(value: number): boolean {
  return (TR_VAT_RATES as readonly number[]).includes(value);
}

function parsePosAsteriskLine(line: string): PosLineBinding | null {
  const trimmed = line.trim();
  if (!trimmed || /%/.test(trimmed)) return null;

  const match = trimmed.match(POS_ASTERISK_QTY_LINE);
  if (!match?.[2] || !match[3]) return null;

  const quantity = parseTrNumber(match[2]);
  const lineTotal = parseTrNumber(match[3]);
  if (quantity == null || quantity <= 1 || lineTotal == null || lineTotal <= 0) {
    return null;
  }

  // Guard: single-asterisk VAT confusion (qty equals VAT rate with unitPrice = lineTotal).
  if (
    isTrVatRate(quantity) &&
    Math.abs(lineTotal - quantity) > 0.5 &&
    Math.abs(lineTotal / quantity - quantity) > 0.5
  ) {
    // qty=10, total=625 → unitPrice=62.5 — valid POS multiplier, not VAT.
  } else if (
    isTrVatRate(quantity) &&
    Math.abs(lineTotal - quantity) <= 0.011
  ) {
    return null;
  }

  const unitPrice = Math.round((lineTotal / quantity) * 100) / 100;
  const expected = roundLineTotal(quantity, unitPrice);
  if (Math.abs(expected - lineTotal) > 0.05) return null;

  const nameHint = (match[1] ?? "").trim();
  return { nameHint, quantity, unitPrice, lineTotal };
}

/** Scan rawText for POS `*QTY *TOTAL` lines (not `%VAT`). */
export function extractPosLineBindings(rawText: string): PosLineBinding[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bindings: PosLineBinding[] = [];
  for (const line of lines) {
    const binding = parsePosAsteriskLine(line);
    if (binding) bindings.push(binding);
  }
  return bindings;
}

function bindingImprovesItem(item: ReceiptItem, binding: PosLineBinding): boolean {
  if (binding.nameHint) {
    if (!namesMatch(item.name, binding.nameHint)) return false;
  } else {
    if (Math.abs(item.lineTotal - binding.lineTotal) > 0.5) return false;
  }

  const currentQty = item.quantity ?? 1;
  const currentUnit = item.unitPrice ?? item.lineTotal;
  const currentDelta = Math.abs(roundLineTotal(currentQty, currentUnit) - item.lineTotal);
  const bindingDelta = Math.abs(
    roundLineTotal(binding.quantity, binding.unitPrice) - binding.lineTotal
  );

  if (currentQty === binding.quantity && currentDelta <= 0.011) return false;
  if (bindingDelta > 0.05) return false;

  return bindingDelta <= currentDelta || currentQty === 1;
}

function applyBinding(item: ReceiptItem, binding: PosLineBinding): ReceiptItem {
  return {
    ...item,
    quantity: binding.quantity,
    unit: item.unit ?? binding.unit,
    unitPrice: binding.unitPrice,
    lineTotal: binding.lineTotal,
  };
}

/**
 * Bind POS thermal `*QTY *TOTAL` patterns from rawText to product rows.
 * Runs after VAT cleanup so `%10` is never treated as quantity.
 */
export function bindPosLineQuantities(parsed: ParsedReceipt): ParsedReceipt {
  if (!parsed.rawText?.trim()) return parsed;

  const bindings = extractPosLineBindings(parsed.rawText);
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
