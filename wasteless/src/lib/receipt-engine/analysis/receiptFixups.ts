/**
 * Deterministic receipt fix-ups (no AI) applied on top of the layered engine's
 * PurchaseDraft. These implement the Master Fix behaviours:
 *
 *  - Multi-line quantity multipliers ("9 AD x 40,00", "0,744 kg x 89,90")
 *  - Migros-style discount deduction (negative discount lines) + subtotal
 *    reconciliation so the computed subtotal matches the printed total
 *  - Online e-commerce table disambiguation (delivery fee vs. retail bag,
 *    VAT-percent tokens leaking into names)
 *
 * Everything here is a pure function so it is trivially unit-testable and safe
 * to reuse from the pipeline, the classic /api/analyze path, and the UI.
 */
import { parseTrNumber } from "../layer-6-purchase/parsers/parseNumber";
import { parseUnit } from "../layer-6-purchase/parsers/unitParser";
import { WEIGHTED_PATTERN } from "../patterns/neutral";

/** Round to 2 decimals without binary-float drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Fold Turkish diacritics so matching is accent/case-insensitive. */
function fold(value: string): string {
  return value
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Multi-line quantity multipliers
// ---------------------------------------------------------------------------

export interface MultiplierParse {
  quantity: number;
  unit?: string;
  unitPrice: number;
  lineTotal: number;
}

/**
 * Parse a "{N} {unit} x {PRICE}" multiplier line and bind N → quantity,
 * enforcing lineTotal = quantity * unitPrice.
 * Handles "9 AD x 40,00 TL/AD", "4 AD x 115,00", "0,744 kg x 89,90".
 */
export function parseMultiplierLine(text: string): MultiplierParse | null {
  const m = text.match(WEIGHTED_PATTERN);
  if (!m) return null;
  const quantity = parseTrNumber(m[1] ?? "");
  const unitPrice = parseTrNumber(m[3] ?? "");
  if (quantity === undefined || unitPrice === undefined) return null;
  if (quantity <= 0) return null;
  const unitParsed = m[2] ? parseUnit(m[2]) : undefined;
  return {
    quantity,
    ...(unitParsed?.normalized ? { unit: unitParsed.normalized } : {}),
    unitPrice,
    lineTotal: round2(quantity * unitPrice),
  };
}

/**
 * Return a line total, deriving it from quantity * unitPrice when the printed
 * total is missing. Never overrides an explicit printed total.
 */
export function enforceLineTotal(line: {
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
}): number | undefined {
  if (line.lineTotal != null) return line.lineTotal;
  if (
    line.quantity != null &&
    line.quantity > 0 &&
    line.unitPrice != null &&
    line.unitPrice > 0
  ) {
    return round2(line.quantity * line.unitPrice);
  }
  return line.lineTotal ?? undefined;
}

// ---------------------------------------------------------------------------
// Migros-style discount deduction + subtotal reconciliation
// ---------------------------------------------------------------------------

const DISCOUNT_HINT = /\b(indirim|iskonto|kampanya|discount)\b/;
const SIGNED_MONEY =
  /(-)?\s*\*?\s*(-)?\s*(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2})/;

/**
 * Extract a discount amount as a NEGATIVE number from a discount line such as
 * "% 25 % İNDİRİM %1 *-57,49" → -57.49. Discount lines without an explicit
 * minus sign are still treated as reductions (returned negative). Returns
 * undefined when the line is not a discount line or has no parseable amount.
 */
export function parseDiscountAmount(text: string): number | undefined {
  const folded = fold(text);
  if (!DISCOUNT_HINT.test(folded)) return undefined;
  const m = text.match(SIGNED_MONEY);
  if (!m) return undefined;
  const value = parseTrNumber(m[3] ?? "");
  if (value === undefined) return undefined;
  return -Math.abs(value);
}

export interface ReconcilableLine {
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
}
export interface ReconcilableFooter {
  amount?: number | null;
}
export interface ReconcilableReceipt {
  products: readonly ReconcilableLine[];
  discounts?: readonly ReconcilableFooter[];
  charges?: readonly ReconcilableFooter[];
}

/**
 * Subtotal = Σ product line totals + Σ discounts (negative) + Σ charges.
 * Discounts are deducted so the computed subtotal matches the printed total.
 */
export function computeReconciledSubtotal(receipt: ReconcilableReceipt): number {
  const products = receipt.products.reduce(
    (acc, p) => acc + (enforceLineTotal(p) ?? 0),
    0
  );
  const discounts = (receipt.discounts ?? []).reduce(
    (acc, d) => acc + (d.amount ?? 0),
    0
  );
  const charges = (receipt.charges ?? []).reduce(
    (acc, c) => acc + (c.amount ?? 0),
    0
  );
  return round2(products + discounts + charges);
}

/** Whether the reconciled subtotal matches a printed total within tolerance. */
export function reconcilesToTotal(
  receipt: ReconcilableReceipt,
  total: number | null | undefined,
  tolerance = 0.01
): boolean {
  if (total == null) return false;
  return Math.abs(computeReconciledSubtotal(receipt) - total) <= tolerance;
}

// ---------------------------------------------------------------------------
// Online e-commerce / digital-platform table parsing
// (Migros Hemen, Yemeksepeti, Getir)
// ---------------------------------------------------------------------------

const DELIVERY_FEE_HINT = /\b(nakliye|teslimat|kurye|kargo|gonderim|servis\s*ucret)/;
const RETAIL_BAG_HINT = /\bposet\b/;
const VAT_RATE_VALUES = new Set([0, 1, 8, 10, 18, 20]);

export type EcommerceLineKind = "charge" | "product" | "vat";

/**
 * Classify a digital-platform order-summary line:
 *  - Delivery fees ("Nakliye Ücreti") → charge
 *  - Retail products / bags ("Hemen Poşet") → product
 *  - Standalone VAT-rate cells ("%1", "20") → vat (must not become a product)
 */
export function classifyEcommerceLine(text: string): EcommerceLineKind {
  const trimmed = text.trim();
  if (isStandaloneVatToken(trimmed)) return "vat";
  const folded = fold(trimmed);
  if (DELIVERY_FEE_HINT.test(folded)) return "charge";
  // A retail bag ("Hemen Poşet") is a purchased item, unlike a plain bag
  // charge, so it is classified as a product.
  if (RETAIL_BAG_HINT.test(folded)) return "product";
  return "product";
}

/** True when a cell is only a VAT rate (e.g. "1", "%10", "% 20", "20%"). */
export function isStandaloneVatToken(text: string): boolean {
  const t = text.trim();
  if (!/^%?\s*\d{1,2}\s*%?$/.test(t)) return false;
  const num = Number(t.replace(/[%\s]/g, ""));
  return VAT_RATE_VALUES.has(num);
}

/**
 * Remove VAT-percent tokens that OCR leaks into an item name, e.g.
 * "Hemen Poşet %20" → "Hemen Poşet", "Cola %10 330 ml" → "Cola 330 ml".
 * Only strips explicit percent-formatted tokens to avoid eating real numbers.
 */
export function stripVatPercentTokens(name: string): string {
  return name
    .replace(/%\s*\d{1,2}(?:[.,]\d+)?\b/g, " ")
    .replace(/\b\d{1,2}\s*%/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
