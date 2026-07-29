import productsData from "@/data/products.json";
import aliasesData from "@/data/aliases.json";
import brandsData from "@/data/brands.json";
import categoriesData from "@/data/categories.json";
import type {
  BrandEntry,
  CatalogProduct,
  KnowledgeCategory,
  ProductAliasEntry,
} from "./types";
import { normalizeOcrKey } from "./productNormalizer";
import type { KnowledgeOverlay } from "./kbStore";
import {
  mergeCatalogAliases,
  mergeCatalogBrands,
  mergeCatalogCategories,
  mergeCatalogProducts,
} from "./catalogMerge";

const products = productsData as CatalogProduct[];
const seedAliases = aliasesData as ProductAliasEntry[];
const brands = brandsData as BrandEntry[];
const categories = categoriesData as KnowledgeCategory[];

/** Human-readable canonical display name — never raw OCR. */
export function formatProductDisplay(p: CatalogProduct): string {
  const parts = [p.brand, p.name, p.variant, p.size && p.unit ? `${p.size} ${p.unit}` : ""]
    .map((s) => s?.trim())
    .filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export type KnowledgeBase = {
  products: CatalogProduct[];
  productsById: Map<string, CatalogProduct>;
  aliasIndex: Map<string, string>;
  brandAliasIndex: Map<string, string>;
  categories: KnowledgeCategory[];
  searchKeys: Array<{ id: string; key: string; tokens: string[] }>;
};

function buildSearchKeys(product: CatalogProduct): {
  key: string;
  tokens: string[];
} {
  const display = formatProductDisplay(product);
  const key = normalizeOcrKey(display);
  const tokens = key.split(/\s+/).filter(Boolean);
  return { key, tokens };
}

function mergeAliases(
  seed: ProductAliasEntry[],
  learned: ProductAliasEntry[] = [],
  global: ProductAliasEntry[] = []
): Map<string, string> {
  const merged = mergeCatalogAliases(seed, global, learned);
  const map = new Map<string, string>();
  for (const entry of merged) {
    map.set(normalizeOcrKey(entry.ocr), entry.productId);
  }
  return map;
}

function buildBrandIndex(brandList: BrandEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const brand of brandList) {
    map.set(normalizeOcrKey(brand.name), brand.id);
    for (const alias of brand.aliases) {
      map.set(normalizeOcrKey(alias), brand.id);
    }
  }
  return map;
}

let cached: KnowledgeBase | null = null;
let cachedLearnedKey = "";
let cachedOverlayKey = "";

export type LoadKnowledgeBaseOptions = {
  /** KV snapshot is already seed+import merged — do not merge seed again. */
  canonicalFull?: boolean;
  catalogVersion?: number;
  /**
   * Product matching: build alias index from global catalog only.
   * Personal aliases are resolved in a separate precedence step.
   */
  globalAliasesOnly?: boolean;
};

/** Load bundled knowledge base; merge optional overlay + learned aliases. */
export function loadKnowledgeBase(
  learnedAliases: ProductAliasEntry[] = [],
  overlay?: KnowledgeOverlay | null,
  options?: LoadKnowledgeBaseOptions
): KnowledgeBase {
  const learnedKey = learnedAliases.map((a) => `${a.ocr}:${a.productId}`).join("|");
  const overlayKey = options?.canonicalFull
    ? `kv:${options.catalogVersion ?? 0}`
    : overlay
      ? `${overlay.products.length}:${overlay.aliases.length}:${overlay.brands.length}`
      : "";
  if (cached && cachedLearnedKey === learnedKey && cachedOverlayKey === overlayKey) {
    return cached;
  }

  const canonicalFull = options?.canonicalFull && overlay;

  const mergedProducts = canonicalFull
    ? overlay.products
    : mergeCatalogProducts(products, overlay?.products ?? []);
  const mergedCategories = canonicalFull
    ? overlay.categories
    : mergeCatalogCategories(categories, overlay?.categories ?? []);
  const mergedBrands = canonicalFull
    ? overlay.brands
    : mergeCatalogBrands(brands, overlay?.brands ?? []);

  const resolveId = (productId: string): string => {
    const p = mergedProducts.find((x) => x.id === productId);
    if (p?.status === "merged" && p.mergedIntoId) return p.mergedIntoId;
    return productId;
  };

  const productsById = new Map(mergedProducts.map((p) => [p.id, p]));
  const learnedForIndex = options?.globalAliasesOnly ? [] : learnedAliases;
  const rawAliasIndex = canonicalFull
    ? mergeAliases([], learnedForIndex, overlay.aliases)
    : mergeAliases(seedAliases, learnedForIndex, overlay?.aliases ?? []);
  const aliasIndex = new Map<string, string>();
  for (const [k, v] of Array.from(rawAliasIndex.entries())) {
    aliasIndex.set(k, resolveId(v));
  }
  const brandAliasIndex = buildBrandIndex(mergedBrands);
  const searchKeys = mergedProducts.map((p) => {
    const { key, tokens } = buildSearchKeys(p);
    return { id: p.id, key, tokens };
  });

  cached = {
    products: mergedProducts,
    productsById,
    aliasIndex,
    brandAliasIndex,
    categories: mergedCategories,
    searchKeys,
  };
  cachedLearnedKey = learnedKey;
  cachedOverlayKey = overlayKey;
  return cached;
}

export function getProductById(
  kb: KnowledgeBase,
  productId: string
): CatalogProduct | null {
  return kb.productsById.get(productId) ?? null;
}

export function resolveCanonicalName(
  kb: KnowledgeBase,
  productId: string
): string | null {
  const p = getProductById(kb, productId);
  return p ? formatProductDisplay(p) : null;
}

/** Find catalog product id from a user-corrected canonical display name. */
export function findProductIdByCanonicalName(
  kb: KnowledgeBase,
  canonicalName: string
): string | null {
  const key = normalizeOcrKey(canonicalName);
  for (const p of kb.products) {
    if (normalizeOcrKey(formatProductDisplay(p)) === key) return p.id;
  }
  return null;
}

export function invalidateKnowledgeBaseCache(): void {
  cached = null;
  cachedLearnedKey = "";
  cachedOverlayKey = "";
}

export { products, seedAliases, brands, categories };
