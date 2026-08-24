/**
 * OCR control-character cleanup for parsing only.
 * Raw OCR lines/text must never be mutated — apply at parse time.
 */

const OCR_CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;

/** Remove OCR control characters without altering visible content. */
export function stripOcrControlChars(raw: string): string {
  return raw.replace(OCR_CONTROL_CHARS, "");
}

/**
 * Repair common OCR amount token corruptions (corpus C footer shapes).
 * Does not invent unsupported digits — only:
 * - restores leading 1 when a control char replaced it before `\d.\d{2}` (e.g. \u00018.67 → 18.67)
 * - fixes duplicated leading digit on `\d\d,\d{3}.\d{2}` glitches (11,118.83 → 1.118,83)
 */
export function repairOcrAmountToken(raw: string, token: string): string {
  let s = token.trim();
  if (!s) return s;

  const normalized = stripOcrControlChars(raw);
  const tokenAt = normalized.lastIndexOf(s);
  if (tokenAt >= 0 && OCR_CONTROL_CHARS.test(raw)) {
    const prefixRaw = raw.slice(0, Math.max(0, raw.length - (normalized.length - tokenAt)));
    if (/[\u0000-\u001F]\s*$/.test(prefixRaw) && /^\d\.\d{2}$/.test(s)) {
      s = `1${s}`;
    }
  }

  const duplicatedLeading = s.match(/^(\d)\d,(\d{3})\.(\d{2})$/);
  if (duplicatedLeading) {
    s = `${duplicatedLeading[1]}.${duplicatedLeading[2]},${duplicatedLeading[3]}`;
  }

  return s;
}

/** Extract trailing monetary token candidate from a line (after control-char strip). */
export function extractTrailingAmountToken(raw: string): string | null {
  const normalized = stripOcrControlChars(raw);

  const starMatch = normalized.match(/\*(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:[.,]\d+)?)/);
  if (starMatch?.[1]) return starMatch[1];

  const patterns = [
    /(\d{1,3}(?:\.\d{3})+,\d{2})\s*(?:TL)?\s*$/i,
    /(\d{1,2},\d{3}\.\d{2})\s*(?:TL)?\s*$/i,
    /(\d+,\d{2})\s*(?:TL)?\s*$/i,
    /(\d+\.\d{2})\s*(?:TL)?\s*$/i,
  ];

  for (const pattern of patterns) {
    const m = normalized.match(pattern);
    if (m?.[1]) return m[1];
  }

  return null;
}

function parseTurkishAmountLoose(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, "");
  if (!s) return null;

  s = s.replace(/^\*+/, "");

  if (/,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  if (/^\d+\.\d{2}$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseAmountFromOcrLine(raw: string): number | null {
  const token = extractTrailingAmountToken(raw);
  if (!token) return null;

  const repaired = repairOcrAmountToken(raw, token);
  return parseTurkishAmountLoose(repaired);
}
