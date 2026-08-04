import { normalizeKey } from "@/lib/merchants";

/**
 * Purchase Memory match priority (lower = better).
 * Product identity always outranks merchant / receipt-wide text.
 */
export const MATCH_EXACT_PRODUCT = 1;
export const MATCH_ALIAS_PRODUCT = 2;
export const MATCH_CATEGORY = 3;
export const MATCH_WORD_PRODUCT = 4;
export const MATCH_EXACT_MERCHANT = 5;
export const MATCH_WORD_MERCHANT = 6;
export const MATCH_NOTES = 7;
export const MATCH_OCR = 8;

/** Ranks at or above this are merchant / receipt-wide — not product identity. */
export const MATCH_RANK_MERCHANT_FLOOR = MATCH_EXACT_MERCHANT;

const SEARCH_TOKEN_SUFFIXES = new Set([
  "i",
  "u",
  "a",
  "e",
  "si",
  "su",
  "sa",
  "se",
  "yi",
  "yu",
  "ya",
  "ye",
  "gi",
  "gu",
  "ga",
  "ge",
  "ni",
  "nu",
  "na",
  "ne",
  "li",
  "lu",
  "la",
  "le",
  "siz",
  "suz",
  "saz",
  "sez",
  "ler",
  "lar",
  "leri",
  "lari",
  "in",
  "un",
  "an",
  "en",
  "nin",
  "nun",
  "nan",
  "nen",
  "de",
  "da",
  "te",
  "ta",
  "den",
  "dan",
  "ten",
  "tan",
  "yle",
  "yla",
  "dir",
  "dur",
  "dar",
  "der",
  "mis",
  "mus",
  "mas",
  "mes",
]);

const SEARCH_SOFT_FINAL: Record<string, string> = {
  k: "g",
  p: "b",
  c: "c",
  t: "d",
};

export function tokenizeSearchText(value: string | null | undefined): string[] {
  if (!value) return [];
  const normalized = normalizeKey(value);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

function isSizeToken(token: string): boolean {
  return /^\d+(?:[.,]\d+)?$/.test(token);
}

function softStemToken(token: string): string | null {
  if (token.length < 2) return null;
  const soft = SEARCH_SOFT_FINAL[token[token.length - 1]!];
  if (!soft) return null;
  return token.slice(0, -1) + soft;
}

function tokenHasInflection(stem: string, candidate: string): boolean {
  if (candidate.startsWith(stem)) {
    const rem = candidate.slice(stem.length);
    if (SEARCH_TOKEN_SUFFIXES.has(rem)) return true;
  }
  const soft = softStemToken(stem);
  if (soft && candidate.startsWith(soft)) {
    const rem = candidate.slice(soft.length);
    if (SEARCH_TOKEN_SUFFIXES.has(rem)) return true;
  }
  return false;
}

export function searchTokensEqual(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && tokenHasInflection(a, b)) return true;
  if (b.length >= 4 && tokenHasInflection(b, a)) return true;
  return false;
}

export function tokensCoverQuery(
  fieldTokens: string[],
  queryTokens: string[]
): boolean {
  if (queryTokens.length === 0 || fieldTokens.length === 0) return false;
  return queryTokens.every((qt) =>
    fieldTokens.some((ft) => searchTokensEqual(qt, ft))
  );
}

export function productMatchSpecificity(
  fieldTokens: string[],
  queryTokens: string[]
): number {
  if (queryTokens.length === 0 || fieldTokens.length === 0) return 0;
  let matched = 0;
  let sizeHits = 0;
  for (const qt of queryTokens) {
    if (!fieldTokens.some((ft) => searchTokensEqual(qt, ft))) continue;
    matched += 1;
    if (isSizeToken(qt)) sizeHits += 1;
  }
  if (matched === 0) return 0;
  const overlap = fieldTokens.length > 0 ? matched / fieldTokens.length : 0;
  return matched * 100 + sizeHits * 10 + overlap;
}

export function exactNormalizedEquals(
  value: string | null | undefined,
  queryNormalized: string
): boolean {
  if (!value) return false;
  const n = normalizeKey(value);
  return n.length > 0 && n === queryNormalized;
}

export type MatchVerdict = { rank: number; specificity: number };

export function bestFieldMatchRank(
  fields: string[],
  queryTokens: string[],
  queryNormalized: string,
  ranks: {
    exact: number;
    word: number;
  }
): MatchVerdict | null {
  for (const field of fields) {
    if (exactNormalizedEquals(field, queryNormalized)) {
      return {
        rank: ranks.exact,
        specificity:
          1000 + productMatchSpecificity(tokenizeSearchText(field), queryTokens),
      };
    }
  }

  let bestWord: MatchVerdict | null = null;
  for (const field of fields) {
    const fieldTokens = tokenizeSearchText(field);
    if (!tokensCoverQuery(fieldTokens, queryTokens)) continue;
    const specificity = productMatchSpecificity(fieldTokens, queryTokens);
    if (!bestWord || specificity > bestWord.specificity) {
      bestWord = { rank: ranks.word, specificity };
    }
  }
  return bestWord;
}

export function normalizeSearchQuery(query: string): {
  trimmed: string;
  normalized: string;
  tokens: string[];
} | null {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;
  const normalized = normalizeKey(trimmed);
  const tokens = tokenizeSearchText(trimmed);
  if (!normalized || tokens.length === 0) return null;
  return { trimmed, normalized, tokens };
}
