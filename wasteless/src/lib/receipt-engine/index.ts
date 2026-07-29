/**
 * Receipt Engine v2 — isolated parsing infrastructure.
 *
 * This module is intentionally separate from the v1 receipt pipeline.
 * No v1 parser imports. No API wiring yet.
 */

export { ReceiptEngine, runReceiptEngine } from "./pipeline/receiptEngine";
export type { ReceiptEngineOptions } from "./pipeline/receiptEngine";

export {
  createEngineDependencies,
  STUB_AI_GATEWAY,
  STUB_KNOWLEDGE_CONTEXT,
} from "./pipeline/dependencies";
export type {
  EngineDependencies,
  EngineDependenciesOptions,
  AiGateway,
  KnowledgeContextStub,
} from "./pipeline/dependencies";

export { resolveEngineConfig, DEFAULT_ENGINE_CONFIG } from "./config/defaults";
export {
  createStubLayoutProfileRegistry,
} from "./config/profiles";
export type {
  LayoutProfile,
  LayoutProfileRegistry,
} from "./config/profiles";

export { createDebugTrace, getLayerExecutionOrder } from "./pipeline/debugTrace";
export { executeLayer } from "./pipeline/executeLayer";
export { createDefaultLayerStack, layerStackAsOrderedList } from "./pipeline/layerRegistry";

export * from "./types";

// Layer exports (stubs)
export { layer0Image } from "./layer-0-image/imageAcquisition.layer";
export { layer1Ocr } from "./layer-1-ocr/ocrExtractor.layer";
export {
  normalizeOcrExtractOutput,
  normalizeOcrRawPayload,
  ocrDocumentFromRaw,
} from "./layer-1-ocr/normalizeOcrDocument";
export {
  createOcrProvider,
  createOcrProviderFromEnv,
  createMockOcrProvider,
  createOpenAiOcrProvider,
  EMPTY_MOCK_OCR_PROVIDER,
} from "./layer-1-ocr/providers/providerFactory";
export type {
  OcrProvider,
  OcrProviderKind,
  OcrProviderFactoryOptions,
  OcrExtractInput,
  OcrExtractOutput,
} from "./layer-1-ocr/providers/providerFactory";
export { runPipelineFromOcr } from "./pipeline/runPipelineFromOcr";
export { layer2Layout } from "./layer-2-layout/layoutReconstructor.layer";
export { reconstructLayout } from "./layer-2-layout/layoutReconstructor";
export { layer3Graph } from "./layer-3-graph/receiptGraphBuilder.layer";
export { buildReceiptGraph } from "./layer-3-graph/buildReceiptGraph";
export {
  serializeGraphForDebug,
  formatGraphDebug,
  graphToJson,
} from "./layer-3-graph/graphDebug";
export type {
  GraphDebugView,
  GraphDebugNodeView,
  GraphDebugEdgeView,
} from "./layer-3-graph/graphDebug";
export { layer4Classify } from "./layer-4-classify/lineClassifier.layer";
export { buildClassifiedGraph } from "./layer-4-classify/buildClassifiedGraph";
export {
  inspectClassification,
  formatClassificationDebug,
  classifiedGraphToJson,
} from "./layer-4-classify/classifyDebug";
export type { ClassificationInspection } from "./layer-4-classify/classifyDebug";
export { buildGraphIndex, GraphIndex } from "./graph/graphIndex";
export type { GraphRegion } from "./graph/graphIndex";
export { buildRowView, buildAllRowViews } from "./graph/rowView";
export type { RowView, RowViewProvenance } from "./graph/rowView";
export { buildChainView, buildAllChainViews } from "./graph/chainView";
export type { ChainView, ChainViewProvenance } from "./graph/chainView";
export * from "./patterns/neutral";
export { layer5Blocks } from "./layer-5-blocks/blockBuilder.layer";
export { buildBlockDocument } from "./layer-5-blocks/buildBlockDocument";
export {
  inspectBlock,
  formatBlockDebug,
  blockDocumentToJson,
} from "./layer-5-blocks/blockDebug";
export type { BlockInspection } from "./layer-5-blocks/blockDebug";
export { layer6Purchase } from "./layer-6-purchase/purchaseBuilder.layer";
export { buildPurchaseDraft } from "./layer-6-purchase/buildPurchaseDraft";
export {
  inspectPurchase,
  formatPurchaseDebug,
  purchaseDraftToJson,
} from "./layer-6-purchase/purchaseDebug";
export type { PurchaseInspection } from "./layer-6-purchase/purchaseDebug";
export {
  parseQuantity,
  parseUnit,
  parseVatRate,
  parseCurrency,
  parseDate,
  parseTime,
  parseReceiptNumber,
} from "./layer-6-purchase/parsers";
export {
  extractPurchasedQuantity,
  extractPackageAttribute,
  purchasedQuantityToken,
  extractSoldUnitPrice,
} from "./layer-6-purchase/parsers/purchasedQuantity";
export { extractFuelFromProductLines } from "./layer-6-purchase/fuelMapper";
export {
  segmentDocument,
  sectionToCoarseRegion,
  isProductSection,
  nextSectionState,
  looksLikeProductStart,
} from "./document-segmentation";
export type {
  DocumentSection,
  DocumentSegmentation,
  SegmentedLine,
} from "./document-segmentation";
export {
  scoreMerchantLine,
  pickBestMerchant,
} from "./merchant/merchantScorer";
export type { MerchantCandidate } from "./merchant/merchantScorer";
export { layer7Validate } from "./layer-7-validate/validator.layer";
export { buildValidationReport } from "./layer-7-validate/buildValidationReport";
export {
  inspectValidation,
  formatValidationDebug,
  validationReportToJson,
} from "./layer-7-validate/validationDebug";
export type { ValidationInspection } from "./layer-7-validate/validationDebug";
export { layer8Knowledge } from "./layer-8-knowledge/knowledgeEngine.layer";
export { layer9Expense } from "./layer-9-expense/expenseBuilder.layer";
