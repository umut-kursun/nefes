import type {
  BrandEntry,
  CatalogProduct,
  KnowledgeCategory,
  ProductAliasEntry,
} from "./types";
import type { KnowledgeOverlay } from "./kbStore";
import {
  mergeCatalogAliases,
  mergeCatalogBrands,
  mergeCatalogCategories,
  mergeCatalogProducts,
} from "./catalogMerge";
import {
  brands as seedBrands,
  categories as seedCategories,
  products as seedProducts,
  seedAliases,
} from "./knowledgeBase";

/** Single canonical catalog object stored in Cloudflare KV. */
export type CatalogSnapshot = {
  version: number;
  updatedAt: string;
  products: CatalogProduct[];
  aliases: ProductAliasEntry[];
  brands: BrandEntry[];
  categories: KnowledgeCategory[];
};

export const CATALOG_KV_KEY = "catalog:snapshot";

/** Build full canonical catalog = seed merged with import overlay delta. */
export function buildCanonicalSnapshot(
  overlayDelta: KnowledgeOverlay
): Omit<CatalogSnapshot, "version" | "updatedAt"> {
  return {
    products: mergeCatalogProducts(seedProducts, overlayDelta.products),
    aliases: mergeCatalogAliases(seedAliases, overlayDelta.aliases, []),
    brands: mergeCatalogBrands(seedBrands, overlayDelta.brands),
    categories: mergeCatalogCategories(seedCategories, overlayDelta.categories),
  };
}

export function snapshotToOverlay(
  snapshot: CatalogSnapshot
): KnowledgeOverlay {
  return {
    products: snapshot.products,
    aliases: snapshot.aliases,
    brands: snapshot.brands,
    categories: snapshot.categories,
  };
}

/** Overlay used by loadKnowledgeBase when KV snapshot is the full canonical catalog. */
export function canonicalAsOverlay(snapshot: CatalogSnapshot): KnowledgeOverlay {
  return snapshotToOverlay(snapshot);
}

export function emptySnapshot(): CatalogSnapshot {
  return {
    version: 0,
    updatedAt: "",
    products: mergeCatalogProducts(seedProducts, []),
    aliases: mergeCatalogAliases(seedAliases, [], []),
    brands: mergeCatalogBrands(seedBrands, []),
    categories: mergeCatalogCategories(seedCategories, []),
  };
}
