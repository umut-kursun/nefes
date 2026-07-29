/** Canonical product in the knowledge base catalog. */
export type ProductStatus = "active" | "deprecated" | "merged";

export type CatalogProduct = {
  id: string;
  brand: string;
  name: string;
  variant: string;
  size: string;
  unit: string;
  category: string;
  barcode: string | null;
  /** Lifecycle — never physically deleted. */
  status?: ProductStatus;
  /** When status=merged, points to canonical product id. */
  mergedIntoId?: string | null;
};

export type ProductAliasEntry = {
  ocr: string;
  productId: string;
};

export type BrandEntry = {
  id: string;
  name: string;
  aliases: string[];
};

export type KnowledgeCategory = {
  id: string;
  name: string;
  parentId: string | null;
};

export type MatchSource =
  | "personal_alias"
  | "global_alias"
  | "exact"
  | "fuzzy"
  | "ai_normalize"
  | "unknown";

export type ProductMatchResult = {
  productId: string | null;
  canonicalName: string | null;
  confidence: number;
  source: MatchSource;
  normalizedOcr: string;
};

export type LearnedProductAlias = {
  id: string;
  ocr: string;
  productId: string;
  createdAt: string;
};
