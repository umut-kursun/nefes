import { VAT_INLINE, VAT_STANDALONE, isValidTrVatRate } from "../../patterns/neutral";
import { parseTrNumber } from "./parseNumber";
import type { ParsedField } from "../../types/models/purchase";

export function parseVatRate(text: string): ParsedField<number> {
  const raw = text.trim();
  if (!raw) return { raw: text };

  const ocr = raw.match(/^%?\s*[xX×](\d{1,2})$/);
  if (ocr?.[1] && isValidTrVatRate(Number(ocr[1]))) {
    return { raw, normalized: Number(ocr[1]) };
  }

  if (VAT_STANDALONE.test(raw)) {
    const digits = raw.replace(/%/g, "").trim();
    const rate = parseTrNumber(digits);
    if (rate !== undefined) return { raw, normalized: rate };
    return { raw };
  }

  const inline = raw.match(VAT_INLINE);
  if (inline && inline[1]) {
    const rate = parseTrNumber(inline[1]);
    if (rate !== undefined) return { raw, normalized: rate };
  }

  return { raw };
}
