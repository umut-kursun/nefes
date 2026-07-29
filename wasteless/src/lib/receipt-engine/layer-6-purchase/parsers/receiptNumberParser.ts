import { RECEIPT_NO_PATTERN } from "../../patterns/neutral";
import type { ParsedField } from "../../types/models/purchase";

const TRAILING_NUMBER = /(?:fiş\s*no|fis\s*no|fiş\s*#|z\s*no)\s*[:#]?\s*(\S+)/i;
const DIGITS_ONLY = /^\d[\d\s-]*\d$|^\d+$/;

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
