import type { Confidence } from "../provenance";
import type {
  LineSemanticType,
  ReceiptSectionKind,
} from "./sections";
import type { DocumentSegmentation } from "./sections";

export type { ReceiptSectionKind, LineSemanticType, DocumentSegmentation };

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
  sectionKind: ReceiptSectionKind;
  lineSemanticType: LineSemanticType;
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

export interface LayoutDocument {
  lines: LayoutLine[];
  profileId: string;
  readingOrder: number[];
  regions: LayoutRegions;
  segmentation: DocumentSegmentation;
  confidence: Confidence;
}

export function emptyLayoutDocument(profileId = "generic-tr"): LayoutDocument {
  return {
    lines: [],
    profileId,
    readingOrder: [],
    regions: { header: [], body: [], footer: [] },
    segmentation: {
      sections: [],
      sectionByLineIndex: [],
      lineTypes: [],
      parserStates: [],
    },
    confidence: 0,
  };
}
