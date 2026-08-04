import { RECEIPT_NO_PATTERN } from "../../patterns/neutral";
import type { ParsedField } from "../../types/models/purchase";

const TRAILING_NUMBER =
  /(?:fi[sş]\s*no|f[iİ]ş\s*no|fiş\s*#|z\s*no|ekü\s*no|f[iİ]Ş\s*NO)\s*[:#]?\s*(\S+)/i;
const DIGITS_ONLY = /^\d[\d\s-]*\d$|^\d+$/;

/** Higher priority wins when multiple receipt numbers appear on one slip. */
export function receiptNumberPriority(text: string): number {
  const t = text.trim();
  if (/\bf[iİ][sş]\s*no\b/i.test(t)) return 100;
  if (/\bekü\s*no\b/i.test(t)) return 50;
  if (/\bz\s*no\b/i.test(t)) return 10;
  return 20;
}

export function parseReceiptNumber(text: string): ParsedField<string> {
  const raw = text.trim();
  if (!raw) return { raw: text };

  if (DIGITS_ONLY.test(raw.replace(/\s/g, ""))) {
    const normalized = raw.replace(/\s/g, "");
    return { raw, normalized };
  }

  if (!RECEIPT_NO_PATTERN.test(raw)) return { raw };

  const match = raw.match(TRAILING_NUMBER);
  if (!match?.[1]) return { raw };

  const token = match[1].trim();
  const normalized = token.replace(/\s/g, "");
  if (!normalized) return { raw: token };
  return { raw: token, normalized };
}

export function pickBestReceiptNumberText(candidates: readonly string[]): string | null {
  let best: { text: string; priority: number } | null = null;

  for (const text of candidates) {
    const parsed = parseReceiptNumber(text);
    if (!parsed.normalized) continue;
    const priority = receiptNumberPriority(text);
    if (!best || priority > best.priority) {
      best = { text, priority };
    }
  }

  return best?.text ?? null;
}
