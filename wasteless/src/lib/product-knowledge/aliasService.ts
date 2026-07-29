import type { LearnedProductAlias, ProductAliasEntry } from "./types";
import {
  findProductIdByCanonicalName,
  invalidateKnowledgeBaseCache,
  loadKnowledgeBase,
  resolveCanonicalName,
  type KnowledgeBase,
  type LoadKnowledgeBaseOptions,
} from "./knowledgeBase";
import { getCachedKnowledgeOverlay } from "./kbStore";
import type { KnowledgeOverlay } from "./kbStore";
import { normalizeOcrKey } from "./productNormalizer";

export type AliasLookupResult = {
  productId: string | null;
  canonicalName: string | null;
  source: "personal" | "global" | null;
};

function resolveProductId(kb: KnowledgeBase, productId: string): string | null {
  const p = kb.productsById.get(productId);
  if (!p || p.status === "deprecated") return null;
  if (p.status === "merged" && p.mergedIntoId) {
    return resolveProductId(kb, p.mergedIntoId);
  }
  return productId;
}

/** Step 1 — personal user aliases (productAliases from client). */
export function lookupPersonalAlias(
  ocrText: string,
  learnedAliases: ProductAliasEntry[],
  kb: KnowledgeBase
): AliasLookupResult {
  const key = normalizeOcrKey(ocrText);
  for (const entry of learnedAliases) {
    if (normalizeOcrKey(entry.ocr) !== key) continue;
    const productId = resolveProductId(kb, entry.productId);
    if (!productId) continue;
    return {
      productId,
      canonicalName: resolveCanonicalName(kb, productId),
      source: "personal",
    };
  }
  return { productId: null, canonicalName: null, source: null };
}

/** Step 2 — global aliases from the canonical Product Knowledge Base. */
export function lookupGlobalAlias(
  ocrText: string,
  kb: KnowledgeBase
): AliasLookupResult {
  const key = normalizeOcrKey(ocrText);
  const rawId = kb.aliasIndex.get(key) ?? null;
  if (!rawId) {
    return { productId: null, canonicalName: null, source: null };
  }
  const productId = resolveProductId(kb, rawId);
  if (!productId) {
    return { productId: null, canonicalName: null, source: null };
  }
  return {
    productId,
    canonicalName: resolveCanonicalName(kb, productId),
    source: "global",
  };
}

/** @deprecated Use lookupPersonalAlias / lookupGlobalAlias for explicit precedence. */
export function lookupAlias(
  ocrText: string,
  learnedAliases: ProductAliasEntry[] = [],
  globalOverlay?: KnowledgeOverlay | null,
  loadOptions?: LoadKnowledgeBaseOptions
): AliasLookupResult {
  const overlay =
    globalOverlay !== undefined ? globalOverlay : getCachedKnowledgeOverlay();
  const kb = loadKnowledgeBase(learnedAliases, overlay, loadOptions);
  const personal = lookupPersonalAlias(ocrText, learnedAliases, kb);
  if (personal.productId) {
    return { ...personal, source: "personal" };
  }
  const global = lookupGlobalAlias(ocrText, kb);
  if (global.productId) {
    return { ...global, source: "global" };
  }
  return { productId: null, canonicalName: null, source: null };
}

/** Learn from user correction: map OCR → catalog product id. */
export function buildLearnedAlias(
  ocrText: string,
  correctedCanonicalName: string,
  learnedAliases: ProductAliasEntry[] = []
): ProductAliasEntry | null {
  const ocr = ocrText.trim();
  const corrected = correctedCanonicalName.trim();
  if (!ocr || !corrected) return null;
  if (normalizeOcrKey(ocr) === normalizeOcrKey(corrected)) return null;

  const kb = loadKnowledgeBase(learnedAliases, getCachedKnowledgeOverlay());
  const productId = findProductIdByCanonicalName(kb, corrected);
  if (!productId) return null;

  const key = normalizeOcrKey(ocr);
  if (kb.aliasIndex.has(key)) return null;

  return { ocr: ocr.toUpperCase(), productId };
}

export type LearnedAliasRecord = LearnedProductAlias;

export function toAliasEntries(
  records: LearnedProductAlias[]
): ProductAliasEntry[] {
  return records.map((r) => ({ ocr: r.ocr, productId: r.productId }));
}

export function afterAliasPersisted(): void {
  invalidateKnowledgeBaseCache();
}

/** Build new alias entries from user product name corrections on save. */
export function collectAliasLearnings(
  draft: { items: Array<{ name?: string; rawText?: string | null }> },
  saved: { items: Array<{ name?: string; rawText?: string | null }> },
  existingLearned: ProductAliasEntry[] = []
): ProductAliasEntry[] {
  const rows: ProductAliasEntry[] = [];
  const draftItems = draft.items ?? [];
  const savedItems = saved.items ?? [];
  const used = new Set<number>();

  for (const s of savedItems) {
    const corrected = s.name?.trim();
    if (!corrected) continue;
    const sRaw = (s.rawText || "").trim();

    let matchIdx = draftItems.findIndex(
      (d, i) =>
        !used.has(i) &&
        d.rawText &&
        d.rawText.trim() === sRaw &&
        sRaw.length > 0
    );
    if (matchIdx < 0) {
      matchIdx = draftItems.findIndex(
        (d, i) =>
          !used.has(i) &&
          d.name &&
          d.name.trim().toLowerCase() !== corrected.toLowerCase()
      );
    }
    if (matchIdx < 0) continue;
    used.add(matchIdx);
    const d = draftItems[matchIdx]!;
    const ocr = (d.rawText || d.name || "").trim();
    if (!ocr) continue;
    const entry = buildLearnedAlias(ocr, corrected, [
      ...existingLearned,
      ...rows,
    ]);
    if (entry) rows.push(entry);
  }

  return rows;
}
