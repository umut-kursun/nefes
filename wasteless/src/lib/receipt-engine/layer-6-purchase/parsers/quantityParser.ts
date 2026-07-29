import { QTY_TOKEN } from "../../patterns/neutral";
import { parseTrNumber } from "./parseNumber";
import type { ParsedField } from "../../types/models/purchase";
import { parseUnit } from "./unitParser";

export interface QuantityParseResult extends ParsedField<number> {
  unitRaw?: string;
  unitNormalized?: string;
}

export function parseQuantity(text: string): QuantityParseResult {
  const raw = text.trim();
  if (!raw) return { raw: text };

  const match = raw.match(QTY_TOKEN);
  if (!match) {
    const leading = raw.match(/^(\d+(?:[.,]\d+)?)\b/);
    if (leading?.[1]) {
      const qty = parseTrNumber(leading[1]);
      if (qty !== undefined) return { raw, normalized: qty };
    }
    const bare = parseTrNumber(raw);
    if (bare !== undefined) return { raw, normalized: bare };
    return { raw };
  }

  const qty = parseTrNumber(match[1] ?? "");
  const unitRaw = match[2];
  const unitParsed = unitRaw ? parseUnit(unitRaw) : undefined;

  return {
    raw,
    ...(qty !== undefined ? { normalized: qty } : {}),
    ...(unitRaw ? { unitRaw } : {}),
    ...(unitParsed?.normalized ? { unitNormalized: unitParsed.normalized } : {}),
  };
}
