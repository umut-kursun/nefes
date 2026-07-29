import type {
  BrandEntry,
  CatalogProduct,
  KnowledgeCategory,
  ProductAliasEntry,
} from "./types";
import type { ImportApplyPlan, KbHealthStats, KbImportHistoryEntry } from "./import/types";
import { buildCanonicalSnapshot } from "./catalogSnapshot";
import {
  fetchCanonicalCatalog,
  publishCanonicalCatalog,
} from "./catalogClient";
import { db } from "@/lib/db";
import { createId } from "@/lib/utils";
import {
  mergeCatalogBrands,
  mergeCatalogCategories,
  mergeCatalogProducts,
} from "./catalogMerge";
import {
  formatProductDisplay,
  invalidateKnowledgeBaseCache,
  products as seedProducts,
  seedAliases,
  brands as seedBrands,
  categories as seedCategories,
} from "./knowledgeBase";
import { normalizeOcrKey, tokenize, tokenOverlapScore } from "./productNormalizer";

export type KbGlobalAlias = {
  id: string;
  ocr: string;
  productId: string;
  createdAt: string;
};

export type KnowledgeOverlay = {
  products: CatalogProduct[];
  aliases: ProductAliasEntry[];
  brands: BrandEntry[];
  categories: KnowledgeCategory[];
};

let overlayCache: KnowledgeOverlay | null = null;

export async function loadKnowledgeOverlay(): Promise<KnowledgeOverlay> {
  if (!db) {
    return { products: [], aliases: [], brands: [], categories: [] };
  }
  const [products, aliasRows, brands, categories] = await Promise.all([
    db.kbProducts.toArray(),
    db.kbGlobalAliases.toArray(),
    db.kbBrands.toArray(),
    db.kbCategories.toArray(),
  ]);
  return {
    products,
    aliases: aliasRows.map((a) => ({ ocr: a.ocr, productId: a.productId })),
    brands,
    categories,
  };
}

export async function refreshKnowledgeOverlayCache(): Promise<KnowledgeOverlay> {
  overlayCache = await loadKnowledgeOverlay();
  invalidateKnowledgeBaseCache();
  return overlayCache;
}

export function getCachedKnowledgeOverlay(): KnowledgeOverlay | null {
  return overlayCache;
}

/** Apply import plan to an overlay in memory (no persistence). */
export function mergePlanIntoOverlay(
  existing: KnowledgeOverlay,
  plan: ImportApplyPlan
): KnowledgeOverlay {
  const productMap = new Map(existing.products.map((p) => [p.id, p]));

  for (const p of plan.productsToUpsert) {
    productMap.set(p.id, { ...p, status: p.status ?? "active" });
  }

  for (const merge of plan.merges) {
    const old = productMap.get(merge.fromId);
    if (old) {
      productMap.set(merge.fromId, {
        ...old,
        status: "merged",
        mergedIntoId: merge.intoId,
      });
    }
  }

  const aliasMap = new Map(
    existing.aliases.map((a) => [normalizeOcrKey(a.ocr), a])
  );
  for (const a of plan.aliasesToAdd) {
    const key = normalizeOcrKey(a.ocr);
    if (!aliasMap.has(key)) {
      aliasMap.set(key, a);
    }
  }

  const brandMap = new Map(existing.brands.map((b) => [b.id, b]));
  for (const b of plan.brandsToUpsert) {
    brandMap.set(b.id, b);
  }

  const catMap = new Map(existing.categories.map((c) => [c.id, c]));
  for (const c of plan.categoriesToUpsert) {
    catMap.set(c.id, c);
  }

  return {
    products: Array.from(productMap.values()),
    aliases: Array.from(aliasMap.values()),
    brands: Array.from(brandMap.values()),
    categories: Array.from(catMap.values()),
  };
}

export function computeKbHealth(
  overlay: KnowledgeOverlay
): KbHealthStats {
  const mergedProducts = mergeCatalogProducts(seedProducts, overlay.products);
  const allAliases = [...seedAliases, ...overlay.aliases];
  const allBrands = mergeCatalogBrands(seedBrands, overlay.brands);
  const allCategories = mergeCatalogCategories(seedCategories, overlay.categories);

  let duplicateCandidates = 0;
  const active = mergedProducts.filter((p) => p.status !== "deprecated");
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const score = tokenOverlapScore(
        tokenize(normalizeOcrKey(formatProductDisplay(active[i]!))),
        tokenize(normalizeOcrKey(formatProductDisplay(active[j]!)))
      );
      if (score >= 0.88 && score < 0.98) duplicateCandidates += 1;
    }
  }

  return {
    products: active.length,
    aliases: allAliases.length,
    brands: allBrands.length,
    categories: allCategories.length,
    duplicateCandidates,
    missingCategory: active.filter((p) => !p.category?.trim()).length,
    missingPackageSize: active.filter((p) => !p.size || !p.unit).length,
    missingBrand: active.filter((p) => !p.brand?.trim()).length,
    deprecated: mergedProducts.filter((p) => p.status === "deprecated").length,
    merged: mergedProducts.filter((p) => p.status === "merged").length,
  };
}

export async function applyKnowledgeImport(
  plan: ImportApplyPlan,
  meta: {
    fileName: string;
    report: import("./import/types").ImportDryRunReport;
  }
): Promise<KbImportHistoryEntry> {
  if (!db) throw new Error("Veritabanı kullanılamıyor.");
  const dexie = db;

  const t0 = Date.now();
  const historyId = createId("kbimp");
  const now = new Date().toISOString();

  const existingOverlay = await loadKnowledgeOverlay();
  const mergedOverlay = mergePlanIntoOverlay(existingOverlay, plan);
  const canonicalBody = buildCanonicalSnapshot(mergedOverlay);
  const remote = await fetchCanonicalCatalog();
  const expectedVersion = remote?.version ?? 0;

  const publishResult = await publishCanonicalCatalog({
    expectedVersion,
    products: canonicalBody.products,
    aliases: canonicalBody.aliases,
    brands: canonicalBody.brands,
    categories: canonicalBody.categories,
  });

  if (!publishResult.ok) {
    throw new Error(publishResult.error);
  }

  try {
    await dexie.transaction(
      "rw",
      dexie.kbProducts,
      dexie.kbGlobalAliases,
      dexie.kbBrands,
      dexie.kbCategories,
      dexie.kbImportHistory,
      async () => {
        const existingProducts = await dexie.kbProducts.toArray();
        const productMap = new Map(existingProducts.map((p) => [p.id, p]));

        for (const p of plan.productsToUpsert) {
          productMap.set(p.id, { ...p, status: p.status ?? "active" });
        }

        for (const merge of plan.merges) {
          const old = productMap.get(merge.fromId);
          if (old) {
            productMap.set(merge.fromId, {
              ...old,
              status: "merged",
              mergedIntoId: merge.intoId,
            });
          }
        }

        await dexie.kbProducts.clear();
        await dexie.kbProducts.bulkPut(Array.from(productMap.values()));

        const existingAliases = await dexie.kbGlobalAliases.toArray();
        const aliasMap = new Map(
          existingAliases.map((a) => [normalizeOcrKey(a.ocr), a])
        );
        for (const a of plan.aliasesToAdd) {
          const key = normalizeOcrKey(a.ocr);
          if (!aliasMap.has(key)) {
            aliasMap.set(key, {
              id: createId("kbalias"),
              ocr: a.ocr,
              productId: a.productId,
              createdAt: now,
            });
          }
        }
        await dexie.kbGlobalAliases.clear();
        await dexie.kbGlobalAliases.bulkPut(Array.from(aliasMap.values()));

        if (plan.brandsToUpsert.length > 0) {
          const brandMap = new Map(
            (await dexie.kbBrands.toArray()).map((b) => [b.id, b])
          );
          for (const b of plan.brandsToUpsert) brandMap.set(b.id, b);
          await dexie.kbBrands.clear();
          await dexie.kbBrands.bulkPut(Array.from(brandMap.values()));
        }

        if (plan.categoriesToUpsert.length > 0) {
          const catMap = new Map(
            (await dexie.kbCategories.toArray()).map((c) => [c.id, c])
          );
          for (const c of plan.categoriesToUpsert) catMap.set(c.id, c);
          await dexie.kbCategories.clear();
          await dexie.kbCategories.bulkPut(Array.from(catMap.values()));
        }

        const entry: KbImportHistoryEntry = {
          id: historyId,
          importedAt: now,
          fileName: meta.fileName,
          productsAdded: meta.report.newProducts.length,
          productsUpdated: meta.report.updatedProducts.length,
          aliasesAdded: meta.report.newAliases.length,
          brandsAdded: meta.report.newBrands.length,
          categoriesAdded: meta.report.newCategories.length,
          duplicatesMerged: meta.report.duplicateProducts.length,
          invalidRows: meta.report.invalidRows.length,
          durationMs: Date.now() - t0,
          status: "success",
          reportSnapshot: meta.report,
        };
        await dexie.kbImportHistory.put(entry);
      }
    );

    await refreshKnowledgeOverlayCache();

    const saved = await dexie.kbImportHistory.get(historyId);
    return saved!;
  } catch (error) {
    const failed: KbImportHistoryEntry = {
      id: historyId,
      importedAt: now,
      fileName: meta.fileName,
      productsAdded: 0,
      productsUpdated: 0,
      aliasesAdded: 0,
      brandsAdded: 0,
      categoriesAdded: 0,
      duplicatesMerged: 0,
      invalidRows: meta.report.invalidRows.length,
      durationMs: Date.now() - t0,
      status: "failed",
    };
    try {
      await dexie.kbImportHistory.put(failed);
    } catch {
      /* ignore */
    }
    throw error;
  }
}

export async function getKbImportHistory(): Promise<KbImportHistoryEntry[]> {
  if (!db) return [];
  return db.kbImportHistory.orderBy("importedAt").reverse().toArray();
}

export async function getKbImportById(
  id: string
): Promise<KbImportHistoryEntry | undefined> {
  if (!db) return undefined;
  return db.kbImportHistory.get(id);
}
