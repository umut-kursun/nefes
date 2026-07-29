import type { Confidence } from "../provenance";

export type GraphNodeKind =
  | "raw_line"
  | "text_fragment"
  | "amount"
  | "vat_token"
  | "quantity_token"
  | "unit_price_token"
  | "label"
  | "noise";

export type GraphEdgeKind =
  | "continues"
  | "same_row"
  | "amount_of"
  | "vat_of"
  | "quantity_of"
  | "unit_price_of"
  | "footer_of"
  | "precedes";

export interface LayoutLineRef {
  lineIndex: number;
}

export interface GraphNodeProvenance {
  readonly layoutLineIndices: readonly number[];
  readonly sourceText: string;
  readonly rawText: string;
  readonly creationRule: string;
  readonly confidence: Confidence;
}

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  text: string;
  amount?: number | null;
  layoutRef: LayoutLineRef;
  provenance: GraphNodeProvenance;
  confidence: Confidence;
  meta?: Readonly<Record<string, unknown>>;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: GraphEdgeKind;
  confidence: Confidence;
}

export interface ReceiptGraphRegions {
  header?: readonly string[];
  body?: readonly string[];
  footer?: readonly string[];
}

export interface ReceiptGraph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly regions: ReceiptGraphRegions;
  readonly profileId: string;
  readonly confidence: Confidence;
}

export function emptyReceiptGraph(profileId = "generic-tr"): ReceiptGraph {
  return Object.freeze({
    nodes: Object.freeze([]),
    edges: Object.freeze([]),
    regions: Object.freeze({}),
    profileId,
    confidence: 0,
  });
}
