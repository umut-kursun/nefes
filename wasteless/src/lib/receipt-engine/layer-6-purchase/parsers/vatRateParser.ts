import { VAT_INLINE, VAT_STANDALONE } from "../../patterns/neutral";
import { parseTrNumber } from "./parseNumber";
import type { ParsedField } from "../../types/models/purchase";

export function parseVatRate(text: string): ParsedField<number> {
  const raw = text.trim();
  if (!raw) return { raw: text };

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
