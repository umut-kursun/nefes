import type { Confidence } from "../provenance";
import type { DocumentSection } from "../document-segmentation/types";

export type LayoutRegion = "header" | "body" | "footer";

export interface LayoutLineColumns {
  name?: string;
  vat?: string;
  amount?: string;
}

export interface LayoutLineFeatures {
  hasVatToken: boolean;
  hasWeightPattern: boolean;
  hasQuantityToken: boolean;
  isAmountOnly: boolean;
  isLikelyContinuation: boolean;
  isRightAlignedPrice: boolean;
}

export interface LayoutLineTokens {
  quantity?: string;
  vat?: string;
}

export interface LayoutLine {
  index: number;
  text: string;
  rawText: string;
  region: LayoutRegion;
  /** Fine-grained document section from the segmentation state machine. */
  section?: DocumentSection;
  columns?: LayoutLineColumns;
  trailingAmount?: number | null;
  features: LayoutLineFeatures;
  tokens?: LayoutLineTokens;
  confidence: Confidence;
}

export interface LayoutRegions {
  header: number[];
  body: number[];
  footer: number[];
}

export type LayoutSections = Partial<
  Record<DocumentSection, readonly number[]>
>;

export interface LayoutDocument {
  lines: LayoutLine[];
  profileId: string;
  readingOrder: number[];
  regions: LayoutRegions;
  /** Fine section index lists from document segmentation. */
  sections?: LayoutSections;
  /** First index of TOTALS-or-later; products must end before this. */
  productsEndIndex?: number;
  confidence: Confidence;
}

export function emptyLayoutDocument(profileId = "generic-tr"): LayoutDocument {
  return {
    lines: [],
    profileId,
    readingOrder: [],
    regions: { header: [], body: [], footer: [] },
    confidence: 0,
  };
}
