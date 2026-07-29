import type { KnowledgeOverlay } from "./kbStore";
import type {
  BrandEntry,
  CatalogProduct,
  KnowledgeCategory,
  ProductAliasEntry,
} from "./types";
import { normalizeOcrKey } from "./productNormalizer";

export function mergeCatalogProducts(
  seed: CatalogProduct[],
  overlay: CatalogProduct[] = []
): CatalogProduct[] {
  const byId = new Map<string, CatalogProduct>(
    seed.map((p) => [p.id, { ...p, status: p.status ?? "active" }])
  );
  for (const p of overlay) {
    const existing = byId.get(p.id);
    byId.set(p.id, {
      ...(existing ?? { status: "active" as const }),
      ...p,
      status: p.status ?? existing?.status ?? "active",
    });
  }
  return Array.from(byId.values()).filter((p) => p.status !== "deprecated");
}

export function mergeCatalogAliases(
  seed: ProductAliasEntry[],
  global: ProductAliasEntry[] = [],
  learned: ProductAliasEntry[] = []
): ProductAliasEntry[] {
  const combined = [...seed, ...global, ...learned];
  const map = new Map<string, ProductAliasEntry>();
  for (const a of combined) {
    map.set(normalizeOcrKey(a.ocr), a);
  }
  return Array.from(map.values());
}

export function mergeCatalogBrands(
  seed: BrandEntry[],
  overlay: BrandEntry[] = []
): BrandEntry[] {
  const byId = new Map(seed.map((b) => [b.id, b]));
  for (const b of overlay) byId.set(b.id, b);
  return Array.from(byId.values());
}

export function mergeCatalogCategories(
  seed: KnowledgeCategory[],
  overlay: KnowledgeCategory[] = []
): KnowledgeCategory[] {
  const byId = new Map(seed.map((c) => [c.id, c]));
  for (const c of overlay) byId.set(c.id, c);
  return Array.from(byId.values());
}

export function overlayToPartial(overlay: KnowledgeOverlay | null | undefined) {
  if (!overlay) return null;
  return overlay;
}
