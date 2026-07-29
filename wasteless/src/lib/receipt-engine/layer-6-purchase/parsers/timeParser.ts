import { TIME_PATTERN } from "../../patterns/neutral";
import type { ParsedField } from "../../types/models/purchase";

export function parseTime(text: string): ParsedField<string> {
  const raw = text.trim();
  if (!raw) return { raw: text };

  const match = raw.match(TIME_PATTERN);
  if (!match?.[1]) return { raw };

  const token = match[1];
  const normalizedToken = token.replace(".", ":");
  const parts = normalizedToken.split(":");
  if (parts.length < 2) return { raw: token };

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return { raw: token };
  }

  const normalized = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  if (parts[2] !== undefined) {
    const sec = Number(parts[2]);
    if (Number.isInteger(sec) && sec >= 0 && sec <= 59) {
      return {
        raw: token,
        normalized: `${normalized}:${String(sec).padStart(2, "0")}`,
      };
    }
    return { raw: token };
  }

  return { raw: token, normalized };
}
