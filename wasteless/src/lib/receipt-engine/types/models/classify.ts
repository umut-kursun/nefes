import type { ReceiptGraph } from "./graph";
import type { Confidence } from "../provenance";

export type SemanticKind =
  | "unknown"
  | "product"
  | "charge"
  | "discount"
  | "payment"
  | "total"
  | "subtotal"
  | "vat"
  | "merchant"
  | "date"
  | "time"
  | "receipt_number"
  | "loyalty"
  | "barcode"
  | "separator"
  | "header"
  | "footer"
  | "other";

export interface ClassificationCandidate {
  readonly semanticKind: SemanticKind;
  readonly confidence: Confidence;
  readonly ruleId: string;
  readonly reason: string;
}

export interface ClassifiedNodeProvenance {
  readonly graphNodeId: string;
  readonly layoutLineIndices: readonly number[];
  readonly sourceText: string;
  readonly rawText: string;
  readonly graphCreationRule: string;
  readonly classificationRules: readonly string[];
  readonly confidence: Confidence;
}

export interface ClassifiedNode {
  readonly id: string;
  readonly graphNodeId: string;
  readonly semanticKind: SemanticKind;
  readonly confidence: Confidence;
  readonly matchedRules: readonly string[];
  readonly alternativeCandidates: readonly ClassificationCandidate[];
  readonly provenance: ClassifiedNodeProvenance;
  readonly amount?: number | null;
}

export interface ClassifiedGraph {
  readonly graph: ReceiptGraph;
  readonly nodes: readonly ClassifiedNode[];
  readonly confidence: Confidence;
}

/** @deprecated Layer 5+ will consume ClassifiedNode; kept for transitional typing. */
export interface ClassifiedGroup {
  id: string;
  nodeIds: string[];
  kind: SemanticKind;
  subType?: string;
  label: string;
  amount?: number | null;
  confidence: Confidence;
  reason: string;
}

export function emptyClassifiedGraph(graph: ReceiptGraph): ClassifiedGraph {
  return Object.freeze({
    graph,
    nodes: Object.freeze([]),
    confidence: 0,
  });
}
