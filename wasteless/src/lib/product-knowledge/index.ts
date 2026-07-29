export type {
  BrandEntry,
  CatalogProduct,
  KnowledgeCategory,
  LearnedProductAlias,
  MatchSource,
  ProductAliasEntry,
  ProductMatchResult,
  ProductStatus,
} from "./types";

export type {
  ImportDryRunReport,
  KbHealthStats,
  KbImportHistoryEntry,
} from "./import/types";

export {
  formatProductDisplay,
  findProductIdByCanonicalName,
  getProductById,
  loadKnowledgeBase,
  resolveCanonicalName,
  invalidateKnowledgeBaseCache,
} from "./knowledgeBase";

export {
  loadKnowledgeOverlay,
  refreshKnowledgeOverlayCache,
  getCachedKnowledgeOverlay,
  applyKnowledgeImport,
  computeKbHealth,
  getKbImportHistory,
} from "./kbStore";

export {
  verifyKbAdminPassword,
  isKbAdminSessionValid,
  aiNormalizeImportRow,
} from "./adminAuth";

export { parseImportFile, supportedImportExtensions } from "./import/fileParser";
export { runImportDryRun } from "./import/dryRunPipeline";

export {
  normalizeOcrKey,
  normalizeOcrText,
  extractSizeTokens,
  tokenize,
  tokenOverlapScore,
  foldTurkish,
} from "./productNormalizer";

export {
  lookupAlias,
  buildLearnedAlias,
  collectAliasLearnings,
  toAliasEntries,
  afterAliasPersisted,
} from "./aliasService";

export {
  matchProduct,
  canonicalFromId,
  FUZZY_MATCH_THRESHOLD,
} from "./productMatcher";
