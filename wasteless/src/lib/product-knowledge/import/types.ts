import type {
  BrandEntry,
  CatalogProduct,
  KnowledgeCategory,
  ProductAliasEntry,
} from "../types";

export type ProductStatus = "active" | "deprecated" | "merged";

export type ParsedImportRow = {
  rowIndex: number;
  raw: Record<string, string>;
  brand: string;
  name: string;
  variant: string;
  size: string;
  unit: string;
  category: string;
  barcode: string | null;
  price: number | null;
  aliases: string[];
  confidence: number;
  errors: string[];
};

export type ImportConflict = {
  existingId: string;
  existing: string;
  imported: string;
  reason: string;
};

export type ImportDryRunReport = {
  fileName: string;
  totalRows: number;
  newProducts: Array<{ id: string; display: string; row: ParsedImportRow }>;
  updatedProducts: Array<{
    id: string;
    existing: string;
    imported: string;
    changes: string[];
  }>;
  duplicateProducts: Array<{
    imported: string;
    existingId: string;
    existing: string;
    reason: string;
  }>;
  newBrands: Array<{ id: string; name: string }>;
  newCategories: Array<{ id: string; name: string }>;
  newAliases: Array<{ ocr: string; productId: string; display: string }>;
  invalidRows: Array<{
    rowIndex: number;
    reason: string;
    raw: Record<string, string>;
  }>;
  conflicts: ImportConflict[];
  learnedProducts: string[];
  learnedAliases: Array<{ ocr: string; target: string }>;
  durationMs: number;
};

export type ImportApplyPlan = {
  productsToUpsert: CatalogProduct[];
  aliasesToAdd: ProductAliasEntry[];
  brandsToUpsert: BrandEntry[];
  categoriesToUpsert: KnowledgeCategory[];
  merges: Array<{ fromId: string; intoId: string }>;
};

export type KbImportHistoryEntry = {
  id: string;
  importedAt: string;
  fileName: string;
  productsAdded: number;
  productsUpdated: number;
  aliasesAdded: number;
  brandsAdded: number;
  categoriesAdded: number;
  duplicatesMerged: number;
  invalidRows: number;
  durationMs: number;
  status: "success" | "failed" | "cancelled";
  reportSnapshot?: ImportDryRunReport;
};

export type KbHealthStats = {
  products: number;
  aliases: number;
  brands: number;
  categories: number;
  duplicateCandidates: number;
  missingCategory: number;
  missingPackageSize: number;
  missingBrand: number;
  deprecated: number;
  merged: number;
};
