/**
 * Receipt OCR product-name cleaner.
 * Strips tax rates, PLU/barcodes and OCR garbage so Purchase Memory
 * stores what the user remembers buying — not the receipt line.
 *
 * Raw OCR text is preserved separately on ReceiptItem.rawText.
 */

const VAT_TOKEN =
  /\b(?:kdv|kd\.?v\.?|vat|vergi)\s*[:=]?\s*%?\s*\d{1,2}(?:[.,]\d{1,2})?\b/gi;

const BARE_PERCENT = /%\s*\d{1,2}(?:[.,]\d{1,2})?\b/g;

/** Long digit runs (barcodes / PLU). Keep short pack sizes via other rules. */
const LONG_CODE = /\b\d{7,}\b/g;

const TRAILING_CODE = /(?:^|\s)(?:[*#]\s*\d+|\d{4,})\s*$/g;

const SYMBOL_NOISE = /[|_~^=`]+/g;

/** Repeated adjacent words from OCR (e.g. "Cola Cola"). */
function dedupeAdjacentWords(value: string): string {
  const parts = value.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.toLocaleLowerCase("tr-TR") === part.toLocaleLowerCase("tr-TR")
    ) {
      continue;
    }
    out.push(part);
  }
  return out.join(" ");
}

const X_TOTAL_IN_NAME = /\bx\s*\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})\b/gi;
const STAR_TOTAL_IN_NAME = /\s*\*\s*\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})\b/gi;

const TRAILING_UNIT_TOKEN =
  /\s+(?:ADET|AD|PCS|PC|EA|UNIT|PK|PAKET)\s*$/i;

/** OCR brand misreads — canonical spellings for memory/search. */
const BRAND_OCR_FIXES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bCOLA\s+TÜRK(?:IYE|İYE)\b/gi, "COLA TURKA"],
  [/\bCOLA\s+TÜRK\b/gi, "COLA TURKA"],
  [/\bCOLA\s+TURK\b/gi, "COLA TURKA"],
  [/\bULUDA[ĞG]\s+L[İI]MONADA\s+[ŞS]EKS[İI]Z\b/gi, "Uludağ Limonata Şekersiz"],
];

function applyBrandOcrFixes(value: string): string {
  let out = value;
  for (const [pattern, replacement] of BRAND_OCR_FIXES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Clean a raw OCR product line for display / memory.
 * Returns trimmed cleaned string (may be empty if input was only garbage).
 */
export function cleanProductName(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw.replace(/\u00a0/g, " ").trim();
  if (!s) return "";

  s = s.replace(VAT_TOKEN, " ");
  s = s.replace(BARE_PERCENT, " ");
  s = s.replace(/\s*\*+\s*$/g, " ");
  s = s.replace(/\s*\*+\s*(?=%)/g, " ");
  // "x999,99" is a line total marker — never keep in the product name
  s = s.replace(X_TOTAL_IN_NAME, " ");
  s = s.replace(STAR_TOTAL_IN_NAME, " ");
  s = s.replace(TRAILING_UNIT_TOKEN, " ");
  s = s.replace(LONG_CODE, " ");
  s = s.replace(TRAILING_CODE, " ");
  s = s.replace(SYMBOL_NOISE, " ");
  // Trailing punctuation / orphan symbols
  s = s.replace(/[\s.,;:/\\-]+$/g, "").trim();
  s = s.replace(/^[.,;:/\\-]+\s*/g, "").trim();
  s = s.replace(/\s{2,}/g, " ").trim();
  s = dedupeAdjacentWords(s);
  s = applyBrandOcrFixes(s);

  return s.trim();
}

/**
 * Prefer cleaned display name; fall back to original if cleaning wiped everything.
 */
export function displayProductName(raw: string | null | undefined): string {
  const cleaned = cleanProductName(raw);
  if (cleaned) return cleaned;
  return (raw ?? "").trim();
}
