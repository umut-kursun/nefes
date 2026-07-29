import type { ProductMatchResult } from "./types";
import {
  lookupGlobalAlias,
  lookupPersonalAlias,
} from "./aliasService";
import {
  findProductIdByCanonicalName,
  formatProductDisplay,
  loadKnowledgeBase,
  resolveCanonicalName,
  type KnowledgeBase,
  type LoadKnowledgeBaseOptions,
} from "./knowledgeBase";
import { getCachedKnowledgeOverlay } from "./kbStore";
import type { KnowledgeOverlay } from "./kbStore";
import {
  extractSizeTokens,
  normalizeOcrKey,
  normalizeOcrText,
  tokenOverlapScore,
  tokenize,
} from "./productNormalizer";
import type { ProductAliasEntry } from "./types";

/** Minimum confidence to accept a fuzzy catalog match. */
export const FUZZY_MATCH_THRESHOLD = 0.72;

type CatalogMatchContext = {
  kb: KnowledgeBase;
  normalizedOcr: string;
  normalizedKey: string;
  ocrTokens: string[];
  ocrSizes: string[];
};

function buildCatalogContext(
  ocrText: string,
  learnedAliases: ProductAliasEntry[],
  globalOverlay: KnowledgeOverlay | null | undefined,
  loadOptions?: LoadKnowledgeBaseOptions
): CatalogMatchContext {
  const normalizedOcr = normalizeOcrText(ocrText);
  const normalizedKey = normalizeOcrKey(ocrText);
  const kb = loadKnowledgeBase(learnedAliases, globalOverlay, {
    ...loadOptions,
    globalAliasesOnly: true,
  });
  return {
    kb,
    normalizedOcr,
    normalizedKey,
    ocrTokens: tokenize(normalizedOcr),
    ocrSizes: extractSizeTokens(normalizedOcr),
  };
}

function emptyResult(normalizedOcr: string, confidence = 0): ProductMatchResult {
  return {
    productId: null,
    canonicalName: null,
    confidence,
    source: "unknown",
    normalizedOcr,
  };
}

function hitResult(
  ctx: CatalogMatchContext,
  productId: string,
  confidence: number,
  source: ProductMatchResult["source"]
): ProductMatchResult {
  return {
    productId,
    canonicalName: resolveCanonicalName(ctx.kb, productId),
    confidence,
    source,
    normalizedOcr: ctx.normalizedOcr,
  };
}

/** Step 3 — exact canonical product match (searchKeys / display name). */
export function lookupExactCanonical(
  ctx: CatalogMatchContext
): ProductMatchResult | null {
  for (const entry of ctx.kb.searchKeys) {
    if (entry.key !== ctx.normalizedKey) continue;
    const product = ctx.kb.productsById.get(entry.id);
    if (!product || product.status === "deprecated") continue;
    return hitResult(ctx, entry.id, 0.97, "exact");
  }

  const byName = findProductIdByCanonicalName(ctx.kb, ctx.normalizedOcr);
  if (byName) {
    return hitResult(ctx, byName, 0.97, "exact");
  }

  return null;
}

/** Step 4 — fuzzy match using canonical searchKeys. Never runs before alias steps. */
export function fuzzyMatchCatalog(
  ctx: CatalogMatchContext
): { match: ProductMatchResult | null; bestScore: number } {
  let bestId: string | null = null;
  let bestScore = 0;

  for (const entry of ctx.kb.searchKeys) {
    const product = ctx.kb.productsById.get(entry.id)!;
    if (product.status === "deprecated") continue;

    const productSizes = extractSizeTokens(entry.key);

    if (ctx.ocrSizes.length > 0 && productSizes.length > 0) {
      const sizeMatch = ctx.ocrSizes.every((s) => productSizes.includes(s));
      if (!sizeMatch) continue;
    } else if (ctx.ocrSizes.length > 0 && productSizes.length === 0) {
      continue;
    }

    let score = tokenOverlapScore(ctx.ocrTokens, entry.tokens);

    if (
      entry.key.startsWith(ctx.normalizedKey.slice(0, 6)) ||
      ctx.normalizedKey.startsWith(entry.key.slice(0, 6))
    ) {
      score += 0.08;
    }

    const brandKey = normalizeOcrKey(product.brand);
    if (brandKey && ctx.normalizedKey.includes(brandKey)) {
      score += 0.1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = entry.id;
    }
  }

  if (bestId && bestScore >= FUZZY_MATCH_THRESHOLD) {
    return {
      match: hitResult(ctx, bestId, Math.min(0.95, bestScore), "fuzzy"),
      bestScore,
    };
  }

  return { match: null, bestScore };
}

/**
 * Deterministic product matching precedence:
 * 1. Personal user aliases
 * 2. Global KB aliases
 * 3. Exact canonical product match
 * 4. Fuzzy searchKeys match
 * (Step 5 AI normalization is applied by applyProductKnowledge when unresolved.)
 */
export function matchProduct(
  ocrText: string,
  learnedAliases: ProductAliasEntry[] = [],
  globalOverlay?: KnowledgeOverlay | null,
  loadOptions?: LoadKnowledgeBaseOptions
): ProductMatchResult {
  const trimmed = ocrText?.trim() ?? "";
  if (!trimmed) {
    return emptyResult("");
  }

  const overlay =
    globalOverlay !== undefined ? globalOverlay : getCachedKnowledgeOverlay();
  const ctx = buildCatalogContext(trimmed, learnedAliases, overlay, loadOptions);

  // 1 — personal user aliases (always first)
  const personal = lookupPersonalAlias(trimmed, learnedAliases, ctx.kb);
  if (personal.productId && personal.canonicalName) {
    return hitResult(ctx, personal.productId, 0.99, "personal_alias");
  }

  // 2 — global aliases from canonical KB
  const global = lookupGlobalAlias(trimmed, ctx.kb);
  if (global.productId && global.canonicalName) {
    return hitResult(ctx, global.productId, 0.98, "global_alias");
  }

  // 3 — exact canonical product match
  const exact = lookupExactCanonical(ctx);
  if (exact) return exact;

  // 4 — fuzzy match (never before alias checks)
  const fuzzy = fuzzyMatchCatalog(ctx);
  if (fuzzy.match) return fuzzy.match;

  // 6 — unresolved (step 5 handled asynchronously upstream)
  return emptyResult(ctx.normalizedOcr, fuzzy.bestScore);
}

/** Resolve canonical display from product id. */
export function canonicalFromId(productId: string): string | null {
  const kb = loadKnowledgeBase([], getCachedKnowledgeOverlay());
  const p = kb.productsById.get(productId);
  return p ? formatProductDisplay(p) : null;
}
