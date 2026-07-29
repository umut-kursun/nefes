/** Canonical merchant names for Turkish retailers / chains. */
const MERCHANT_ALIASES: Record<string, string[]> = {
  Migros: [
    "migros",
    "migros ticaret",
    "migros ticaret a.s",
    "migros ticaret a.ş",
    "migros a.s",
    "migros a.ş",
    "migroskurumsal",
  ],
  Shell: [
    "shell",
    "shell select",
    "shell petrol",
    "shell turkey",
    "shell türkiye",
    "shell istasyon",
  ],
  Opet: ["opet", "opet petrol", "opet petrolcülük"],
  BP: ["bp", "bp petrol", "bp turkey"],
  Total: ["total", "total energies", "totalenergies", "total istasyon"],
  "Petrol Ofisi": ["po", "petrol ofisi", "petrolofisi"],
  Starbucks: ["starbucks", "starbucks coffee", "sbux"],
  "Coffee Lab": ["coffeelab", "coffee lab"],
  Espressolab: ["espressolab", "espresso lab"],
  "Gloria Jean's": ["gloria jeans", "gloria jean's", "gloriajeans"],
  CarrefourSA: ["carrefour", "carrefoursa", "carrefour sa", "carrefour sa a.s"],
  A101: ["a101", "a 101", "a-101"],
  BİM: ["bim", "bіm", "bim birleşik mağazalar"],
  Şok: ["sok", "şok", "sok market", "şok market"],
  File: ["file", "file market"],
  Macrocenter: ["macrocenter", "macro center"],
  "Happy Center": ["happy center", "happycenter"],
  Watsons: ["watsons", "watson's"],
  Gratis: ["gratis"],
  MediaMarkt: ["mediamarkt", "media markt"],
  Teknosa: ["teknosa"],
  Vatan: ["vatan", "vatan bilgisayar"],
  "McDonald's": ["mcdonalds", "mcdonald's", "mc donalds", "mcd"],
  "Burger King": ["burger king", "burgerking", "bk"],
  "Domino's": ["dominos", "domino's", "domino s"],
  Popeyes: ["popeyes", "popeye's"],
};

function stripDiacritics(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i");
}

export function normalizeKey(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    // Keep decimal pack sizes as one token ("1,5 L" → "1.5 l", not "1"+"5").
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/[^a-z0-9ğüşıöç\s.&'/]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIAS_INDEX = (() => {
  const map = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(MERCHANT_ALIASES)) {
    map.set(normalizeKey(canonical), canonical);
    for (const alias of aliases) {
      map.set(normalizeKey(alias), canonical);
    }
  }
  return map;
})();

/**
 * Collapse OCR variants into a canonical display name.
 * Returns title-cased original when no alias matches.
 */
export function normalizeMerchantName(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const key = normalizeKey(trimmed);
  const exact = ALIAS_INDEX.get(key);
  if (exact) return exact;

  // Prefix / contains match for longer OCR lines ("MIGROS ATASEHIR...")
  for (const [aliasKey, canonical] of Array.from(ALIAS_INDEX.entries())) {
    if (aliasKey.length < 3) continue;
    if (key.startsWith(aliasKey) || key.includes(` ${aliasKey}`)) {
      return canonical;
    }
  }

  return trimmed
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase("tr-TR"));
}

export function merchantsMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeMerchantName(a);
  const nb = normalizeMerchantName(b);
  if (!na || !nb) return false;
  return normalizeKey(na) === normalizeKey(nb);
}
