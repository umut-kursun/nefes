import type { ParsedField } from "../../types/models/purchase";

const CURRENCY_PATTERN =
  /\b(try|tl|₺|usd|\$|eur|€|gbp|£)\b|(\d+[,.]?\d*)\s*(tl|₺)\b/i;

const CODE_MAP: Readonly<Record<string, string>> = {
  try: "TRY",
  tl: "TRY",
  "₺": "TRY",
  usd: "USD",
  $: "USD",
  eur: "EUR",
  "€": "EUR",
  gbp: "GBP",
  "£": "GBP",
};

export function parseCurrency(text: string): ParsedField<string> | null {
  const raw = text.trim();
  if (!raw) return null;

  const match = raw.match(CURRENCY_PATTERN);
  if (!match) return null;

  const token = (match[1] ?? match[3] ?? "").toLowerCase();
  const normalized = CODE_MAP[token];
  if (normalized) return { raw, normalized };

  return { raw };
}
