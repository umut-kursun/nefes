import type { Confidence } from "../provenance";

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
