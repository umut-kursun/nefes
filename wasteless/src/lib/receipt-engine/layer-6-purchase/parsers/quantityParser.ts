import { PURCHASED_QTY_EXPLICIT } from "../../patterns/document";
import { parseTrNumber } from "./parseNumber";
import type { ParsedField } from "../../types/models/purchase";
import { parseUnit } from "./unitParser";

export interface QuantityParseResult extends ParsedField<number> {
  unitRaw?: string;
  unitNormalized?: string;
}

/**
 * Purchased quantity only from explicit expressions (2 x, 3 Adet).
 * Weight/volume attributes (750 GR, 1 LT) are NOT purchased quantity.
 */
export function parseQuantity(text: string): QuantityParseResult {
  const raw = text.trim();
  if (!raw) return { raw: text };

  const explicit = raw.match(PURCHASED_QTY_EXPLICIT);
  if (explicit) {
    const qtyRaw = explicit[1] ?? explicit[2];
    if (qtyRaw) {
      const qty = parseTrNumber(qtyRaw);
      if (qty !== undefined) {
        return { raw, normalized: qty };
      }
    }
  }

  const scaleWeight = raw.match(/^(\d+(?:[.,]\d+)?)\s*(kg|gr|gram)\b/);
  if (scaleWeight?.[1] && scaleWeight?.[2]) {
    const qty = parseTrNumber(scaleWeight[1]);
    const unitParsed = parseUnit(scaleWeight[2]);
    return {
      raw,
      ...(qty !== undefined ? { normalized: qty } : {}),
      unitRaw: scaleWeight[2],
      ...(unitParsed?.normalized ? { unitNormalized: unitParsed.normalized } : {}),
    };
  }

  return { raw };
}
