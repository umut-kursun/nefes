import type { ParsedField } from "../../types/models/purchase";

const UNIT_MAP: Readonly<Record<string, string>> = {
  kg: "kg",
  g: "g",
  gr: "g",
  gram: "g",
  ml: "ml",
  lt: "L",
  l: "L",
  litre: "L",
  adet: "adet",
};

export function parseUnit(text: string): ParsedField<string> {
  const raw = text.trim();
  if (!raw) return { raw: text };

  const key = raw.toLowerCase();
  const normalized = UNIT_MAP[key];
  if (normalized) return { raw, normalized };
  return { raw };
}
