import { QTY_TOKEN } from "../../patterns/neutral";
import { parseTrNumber } from "./parseNumber";
import type { ParsedField } from "../../types/models/purchase";
import { parseUnit } from "./unitParser";
import { extractPurchasedQuantity } from "./purchasedQuantity";

export interface QuantityParseResult extends ParsedField<number> {
  unitRaw?: string;
  unitNormalized?: string;
}

/**
 * Parse purchased quantity from a quantity token string.
 * Package attributes (150 GR, 330 ML) return no normalized quantity.
 */
export function parseQuantity(text: string): QuantityParseResult {
  const raw = text.trim();
  if (!raw) return { raw: text };

  const purchased = extractPurchasedQuantity(raw);
  if (purchased.kind !== "none" && purchased.value !== undefined) {
    return {
      raw: purchased.raw,
      normalized: purchased.value,
      ...(purchased.unit
        ? { unitRaw: purchased.unit, unitNormalized: purchased.unit }
        : {}),
    };
  }

  // Legacy fallback only for pure "N ADET" already handled above.
  // Do NOT treat bare package QTY_TOKEN as purchased quantity.
  if (QTY_TOKEN.test(raw) && !/\badet\b/i.test(raw)) {
    return { raw };
  }

  const explicitAdet = raw.match(/^(\d+(?:[.,]\d+)?)\s*adet$/i);
  if (explicitAdet?.[1]) {
    const qty = parseTrNumber(explicitAdet[1]);
    const unitParsed = parseUnit("adet");
    return {
      raw,
      ...(qty !== undefined ? { normalized: qty } : {}),
      unitRaw: "adet",
      ...(unitParsed.normalized
        ? { unitNormalized: unitParsed.normalized }
        : {}),
    };
  }

  return { raw };
}
