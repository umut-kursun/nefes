/**
 * Defensive money / number parsing for OCR and user input.
 * Handles TR/EN separators, spaces, and common OCR glitches.
 */

const MAX_REASONABLE_LINE = 1_000_000;
const MAX_REASONABLE_TOTAL = 10_000_000;

/**
 * Parse a locale-ambiguous money/number string into a finite number.
 * Returns null when the value cannot be trusted.
 *
 * Examples accepted: 1.023,50 | 1023,50 | 1,023.50 | 1023.50 | 1023 50 | 1 023,50
 */
export function parseMoney(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return raw;
  }
  if (typeof raw !== "string") return null;

  let s = raw
    .trim()
    .replace(/[₺TL\s]/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!s) return null;

  // "1023 50" → treat trailing space+2 digits as decimal cents when no other sep
  if (/^\d+ \d{1,2}$/.test(s)) {
    s = s.replace(" ", ".");
  }

  s = s.replace(/\s/g, "");

  // Keep digits, separators, minus
  s = s.replace(/[^0-9.,\-]/g, "");
  if (!s || s === "-" || s === "." || s === ",") return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  let normalized: string;

  if (lastComma >= 0 && lastDot >= 0) {
    // Both present: the rightmost is decimal separator
    if (lastComma > lastDot) {
      // 1.023,50
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,023.50
      normalized = s.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    const frac = s.length - lastComma - 1;
    if (frac === 3 && s.split(",").length === 2) {
      // Ambiguous 1,023 → thousand sep (TR sometimes uses . for thousands)
      // Prefer thousand when exactly 3 digits and no other commas
      normalized = s.replace(",", "");
    } else {
      // 1023,50 or 1,5
      normalized = s.replace(/\./g, "").replace(",", ".");
    }
  } else if (lastDot >= 0) {
    const frac = s.length - lastDot - 1;
    const parts = s.split(".");
    if (parts.length > 2) {
      // 1.023.50 unlikely; 1.023.456 → strip all but last as decimal if 2 digits
      if (frac === 2) {
        const head = parts.slice(0, -1).join("");
        normalized = `${head}.${parts[parts.length - 1]}`;
      } else {
        normalized = s.replace(/\./g, "");
      }
    } else if (frac === 3 && /^\d+\.\d{3}$/.test(s)) {
      // 1.023 as thousand (TR)
      normalized = s.replace(".", "");
    } else {
      normalized = s;
    }
  } else {
    normalized = s;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Coerce unknown → number|null for Zod preprocess. */
export function coerceMoney(raw: unknown): number | null {
  const n = parseMoney(raw);
  if (n == null) return null;
  // Reject absurd OCR ghosts (e.g. 99999 when total is ~1000)
  if (Math.abs(n) > MAX_REASONABLE_TOTAL) return null;
  return n;
}

export function isReasonableLinePrice(n: number | null | undefined): boolean {
  if (n == null || !Number.isFinite(n)) return false;
  return n >= 0 && n <= MAX_REASONABLE_LINE;
}

export function isReasonableTotal(n: number | null | undefined): boolean {
  if (n == null || !Number.isFinite(n)) return false;
  return n >= 0 && n <= MAX_REASONABLE_TOTAL;
}

/**
 * When line prices are wildly larger than the receipt total, they are
 * almost certainly OCR garbage (e.g. barcode / phone fragments).
 */
export function looksLikeOcrGhostPrice(
  linePrice: number,
  receiptTotal: number | null
): boolean {
  if (!Number.isFinite(linePrice) || linePrice <= 0) return false;
  if (receiptTotal != null && receiptTotal > 0) {
    if (linePrice > receiptTotal * 3) return true;
    if (linePrice >= 9999 && linePrice > receiptTotal) return true;
  }
  if (linePrice >= 50000) return true;
  return false;
}
