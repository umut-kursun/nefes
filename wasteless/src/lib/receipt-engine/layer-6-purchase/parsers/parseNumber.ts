/** Parse TR-style decimal numbers without locale guessing. */
export function parseTrNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.replace(/\s/g, "");
  const commaIdx = normalized.lastIndexOf(",");
  const dotIdx = normalized.lastIndexOf(".");

  let value: string;
  if (commaIdx >= 0 && dotIdx >= 0) {
    if (commaIdx > dotIdx) {
      value = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      value = normalized.replace(/,/g, "");
    }
  } else if (commaIdx >= 0) {
    value = normalized.replace(",", ".");
  } else {
    value = normalized;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}
