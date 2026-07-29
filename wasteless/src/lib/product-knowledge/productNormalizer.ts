/**
 * Normalize OCR text for alias lookup and fuzzy matching.
 * Produces uppercase ASCII-ish keys with spaced pack sizes.
 */

const TR_MAP: Record<string, string> = {
  ç: "c",
  Ç: "C",
  ğ: "g",
  Ğ: "G",
  ı: "i",
  İ: "I",
  ö: "o",
  Ö: "O",
  ş: "s",
  Ş: "S",
  ü: "u",
  Ü: "U",
};

const TIGHT_SIZE =
  /(.+?)(\d+(?:[.,]\d+)?)(ML|LT|L|KG|G|GR)\b/gi;

/** Strip diacritics + fold Turkish chars for matching keys. */
export function foldTurkish(value: string): string {
  let out = value;
  for (const [from, to] of Object.entries(TR_MAP)) {
    out = out.split(from).join(to);
  }
  return out
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I");
}

/** Primary normalization key — no spaces, for alias index. */
export function normalizeOcrKey(raw: string): string {
  return normalizeOcrText(raw).replace(/\s+/g, "");
}

/** Readable normalized OCR (uppercase, spaced sizes). */
export function normalizeOcrText(raw: string): string {
  if (!raw?.trim()) return "";

  let text = foldTurkish(raw)
    .toUpperCase()
    .replace(/[.,;:'"`]/g, " ")
    .replace(/[^\w\s/×x*@]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Tight glued: PEPSI330ML → PEPSI 330 ML
  text = text.replace(TIGHT_SIZE, (_, prefix, num, unit) => {
    const u = unit.toUpperCase() === "LT" ? "L" : unit.toUpperCase();
    return `${prefix.trim()} ${num} ${u}`;
  });

  // Fix 15L → 1.5 L (common thermal OCR)
  text = text.replace(/\b15\s*L\b/g, "1.5 L");

  // Normalize units
  text = text.replace(/\b(\d+(?:\.\d+)?)\s*LT\b/g, "$1 L");
  text = text.replace(/\b(\d+(?:\.\d+)?)\s*GR\b/g, "$1 G");
  text = text.replace(/\b(\d+)G\b/g, "$1 G");
  text = text.replace(/\b(\d+)ML\b/g, "$1 ML");

  // Expand known abbreviations
  text = text.replace(/\bDGL\b/g, "DOGAL");
  text = text.replace(/\bKYNK\b/g, "KAYNAK");
  text = text.replace(/\bSKRPR\b/g, "KURU");
  text = text.replace(/\bKBK\b/g, "KABAK");
  text = text.replace(/\bCKRDK\b/g, "CEKIRDEK");

  return text.replace(/\s+/g, " ").trim();
}

/** Extract size tokens for identity-safe matching. */
export function extractSizeTokens(normalized: string): string[] {
  const tokens: string[] = [];
  const re = /\b(\d+(?:\.\d+)?)\s*(ML|L|KG|G|ADET)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    tokens.push(`${m[1]!.replace(",", ".")}${m[2]!.toUpperCase()}`);
  }
  return tokens;
}

export function tokenize(normalized: string): string[] {
  return normalized.split(/\s+/).filter((t) => t.length > 0);
}

/** Token overlap score 0..1 */
export function tokenOverlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let hit = 0;
  for (const t of a) if (setB.has(t)) hit += 1;
  return hit / Math.max(a.length, b.length);
}
