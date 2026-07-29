export type { ImageBundle, ProcessedImage, ImageMeta, OcrDocument, OcrHints, OcrQuality, OcrLineDetail, OcrBoundingBox, OcrSource } from "./models/image";
export type {
  LayoutDocument,
  LayoutLine,
  LayoutRegion,
  LayoutRegions,
  LayoutLineFeatures,
  LayoutLineColumns,
  LayoutLineTokens,
} from "./models/layout";
export type {
  ReceiptGraph,
  GraphNode,
  GraphEdge,
  GraphNodeKind,
  GraphEdgeKind,
  ReceiptGraphRegions,
  LayoutLineRef,
  GraphNodeProvenance,
} from "./models/graph";
export type { ClassifiedGraph, ClassifiedGroup, ClassifiedNode, ClassificationCandidate, SemanticKind, ClassifiedNodeProvenance } from "./models/classify";
export type {
  BlockDocument,
  Block,
  BlockKind,
  BaseBlock,
  BlockProvenance,
  ProductBlock,
  FooterBlock,
  FooterLineEntry,
  MetadataBlock,
  UnknownBlock,
  UnknownEntry,
} from "./models/blocks";
export type { PurchaseDraft } from "./models/purchase";
export type {
  ValidationReport,
  ValidationIssue,
  ValidationIssueProvenance,
  ValidationLocation,
  ValidationReportProvenance,
  ValidationSeverity,
  ValidationCategory,
  ValidatorResult,
} from "./models/validation";
export type { EnrichedPurchase, KnowledgeMatchStats } from "./models/knowledge";
export type {
  PurchaseLine,
  PurchaseFooterLine,
  PurchaseLineProvenance,
  PurchaseFooterLineProvenance,
  PurchaseDraftProvenance,
  ParsedField,
} from "./models/purchase";

export { emptyImageBundle, emptyOcrDocument } from "./models/image";
export { emptyLayoutDocument } from "./models/layout";
export { emptyReceiptGraph } from "./models/graph";
export { emptyClassifiedGraph } from "./models/classify";
export { emptyBlockDocument } from "./models/blocks";
export { emptyPurchaseDraft } from "./models/purchase";
export { emptyValidationReport } from "./models/validation";
export { emptyEnrichedPurchase } from "./models/knowledge";

export type { Confidence, SourceRef, FieldProvenance } from "./provenance";
export { CONFIDENCE, clampConfidence } from "./provenance";

export type { IssueSeverity, IssueCode, PipelineIssue } from "./issues";
export { createLayerStubIssue } from "./issues";

export type {
  LayerId,
  LayerMetrics,
  LayerResult,
  LayerSnapshot,
  EngineDebugTrace,
  LayerContext,
  ReceiptEngineLayer,
} from "./layer";
export { LAYER_ORDER, createLayerMetrics } from "./layer";

export type {
  ImagePayload,
  ReceiptEngineInput,
  EngineConfig,
  EngineResult,
  EngineSuccessResult,
  EngineFailureResult,
  PartialEngineArtifacts,
  EngineMeta,
} from "./pipeline";
export { RECEIPT_ENGINE_VERSION } from "./pipeline";

export type { EngineFailure } from "./failure";
export type { EngineFailureCode } from "./failure-codes";
