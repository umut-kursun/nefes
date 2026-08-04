import { DATE_PATTERN } from "../../patterns/neutral";
import type { ParsedField } from "../../types/models/purchase";

export function parseDate(text: string): ParsedField<string> {
  const raw = text.trim();
  if (!raw) return { raw: text };

  const spaced = raw.match(/\b(\d{1,2})\s+(\d{1,2})\s+(\d{4})\b/);
  if (spaced) {
    const day = Number(spaced[1]);
    const month = Number(spaced[2]);
    const year = Number(spaced[3]);
    if (
      Number.isInteger(day) &&
      Number.isInteger(month) &&
      Number.isInteger(year) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12
    ) {
      const token = `${spaced[1]} ${spaced[2]} ${spaced[3]}`;
      const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { raw: token, normalized: iso };
    }
  }

  const match = raw.match(DATE_PATTERN);
  if (!match?.[1]) return { raw };

  const token = match[1];
  const parts = token.split(/[./-]/);
  if (parts.length !== 3) return { raw: token };

  const [dStr, mStr, yStr] = parts;
  const day = Number(dStr);
  const month = Number(mStr);
  const year = Number(yStr);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12
  ) {
    return { raw: token };
  }

  if (yStr.length !== 4) return { raw: token };

  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { raw: token, normalized: iso };
}
