import type { Confidence } from "../provenance";
import type { SemanticKind } from "./classify";

export type BlockKind = "product" | "footer" | "metadata" | "unknown";

export interface BlockProvenance {
  readonly graphNodeIds: readonly string[];
  readonly layoutLineIndices: readonly number[];
  readonly rawTexts: readonly string[];
  readonly classificationRules: readonly string[];
  readonly confidence: Confidence;
}

export interface BaseBlock {
  readonly id: string;
  readonly kind: BlockKind;
  readonly nodeRefs: readonly string[];
  readonly provenance: BlockProvenance;
  readonly confidence: Confidence;
}

export interface ProductBlock extends BaseBlock {
  readonly kind: "product";
  readonly label: string;
  readonly quantity: string | null;
  readonly unit: string | null;
  readonly unitPrice: number | null;
  readonly totalPrice: number | null;
  readonly vatToken: string | null;
  readonly chainRawLineIds: readonly string[];
  readonly rawLines: readonly string[];
  /** @deprecated use nodeRefs */
  readonly groupIds: readonly string[];
}

export interface FooterLineEntry {
  readonly label: string;
  readonly amount: number | null;
  readonly nodeRefs: readonly string[];
  readonly semanticKind: SemanticKind;
  readonly confidence: Confidence;
}

export interface FooterBlock extends BaseBlock {
  readonly kind: "footer";
  readonly charges: readonly FooterLineEntry[];
  readonly discounts: readonly FooterLineEntry[];
  readonly payments: readonly FooterLineEntry[];
  readonly subtotals: readonly FooterLineEntry[];
  readonly totals: readonly FooterLineEntry[];
  readonly vatSummaries: readonly FooterLineEntry[];
  readonly unassigned: readonly FooterLineEntry[];
}

export interface MetadataBlock extends BaseBlock {
  readonly kind: "metadata";
  readonly merchant: string | null;
  readonly date: string | null;
  readonly time: string | null;
  readonly receiptNumber: string | null;
  readonly loyalty: string | null;
  readonly barcodes: readonly string[];
}

export interface UnknownEntry {
  readonly nodeRef: string;
  readonly text: string;
  readonly semanticKind: SemanticKind;
  readonly confidence: Confidence;
}

export interface UnknownBlock extends BaseBlock {
  readonly kind: "unknown";
  readonly entries: readonly UnknownEntry[];
}

export type Block = ProductBlock | FooterBlock | MetadataBlock | UnknownBlock;

export interface BlockDocument {
  readonly products: readonly ProductBlock[];
  readonly footer: FooterBlock;
  readonly metadata: MetadataBlock;
  readonly unknown: UnknownBlock;
  readonly confidence: Confidence;
}

export function emptyBlockDocument(): BlockDocument {
  const emptyProv: BlockProvenance = Object.freeze({
    graphNodeIds: [],
    layoutLineIndices: [],
    rawTexts: [],
    classificationRules: [],
    confidence: 0,
  });

  return Object.freeze({
    products: Object.freeze([]),
    footer: Object.freeze({
      id: "footer:empty",
      kind: "footer",
      nodeRefs: [],
      provenance: emptyProv,
      confidence: 0,
      charges: [],
      discounts: [],
      payments: [],
      subtotals: [],
      totals: [],
      vatSummaries: [],
      unassigned: [],
    }),
    metadata: Object.freeze({
      id: "metadata:empty",
      kind: "metadata",
      nodeRefs: [],
      provenance: emptyProv,
      confidence: 0,
      merchant: null,
      date: null,
      time: null,
      receiptNumber: null,
      loyalty: null,
      barcodes: [],
    }),
    unknown: Object.freeze({
      id: "unknown:empty",
      kind: "unknown",
      nodeRefs: [],
      provenance: emptyProv,
      confidence: 0,
      entries: [],
    }),
    confidence: 0,
  });
}
