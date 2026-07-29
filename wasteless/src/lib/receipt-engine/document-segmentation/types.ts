/**
 * Document section taxonomy for receipt segmentation.
 *
 * Sections are produced by a one-way state machine. Parsers must only
 * consume lines from their allowed sections.
 */

export type DocumentSection =
  | "HEADER"
  | "PRODUCTS"
  | "TOTALS"
  | "PAYMENTS"
  | "VAT_SUMMARY"
  | "CARD_SLIP"
  | "LOYALTY"
  | "FOOTER"
  | "END";

/** Coarse layout region kept for graph/classifier compatibility. */
export type CoarseRegion = "header" | "body" | "footer";

export const SECTION_ORDER: readonly DocumentSection[] = [
  "HEADER",
  "PRODUCTS",
  "TOTALS",
  "PAYMENTS",
  "VAT_SUMMARY",
  "CARD_SLIP",
  "LOYALTY",
  "FOOTER",
  "END",
] as const;

/** Map fine sections → legacy header|body|footer. */
export function sectionToCoarseRegion(section: DocumentSection): CoarseRegion {
  switch (section) {
    case "HEADER":
      return "header";
    case "PRODUCTS":
      return "body";
    case "TOTALS":
    case "PAYMENTS":
    case "VAT_SUMMARY":
    case "CARD_SLIP":
    case "LOYALTY":
    case "FOOTER":
    case "END":
      return "footer";
  }
}

/** Only PRODUCTS may create product lines. */
export function isProductSection(section: DocumentSection): boolean {
  return section === "PRODUCTS";
}

export function isFooterLikeSection(section: DocumentSection): boolean {
  return sectionToCoarseRegion(section) === "footer";
}

export interface SegmentedLine {
  readonly index: number;
  readonly text: string;
  readonly section: DocumentSection;
  readonly region: CoarseRegion;
}

export interface DocumentSegmentation {
  readonly lines: readonly SegmentedLine[];
  readonly sections: Readonly<Record<DocumentSection, readonly number[]>>;
  /** Index of first TOTALS (or later) line; lines.length if never reached. */
  readonly productsEndIndex: number;
}
