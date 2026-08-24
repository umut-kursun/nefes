import type { ParsedCharge } from "../core/types";
import type { FooterData } from "../footer/FooterData";
import type { ParsedDiscount, ParsedProduct } from "../parser/ParsedProduct";

/** Traceability for one extracted financial field. */
export type FieldProvenance = {
  readonly value: number | string | null;
  readonly confidence: number;
  readonly sourceLineIndices: readonly number[];
  readonly method: string;
};

export type ExtractedFuel = {
  readonly fuelType: string | null;
  readonly quantity: number | null;
  readonly unit: string | null;
  readonly unitPrice: number | null;
  readonly lineTotal: number | null;
  readonly plateNumber: string | null;
  readonly provenance: FieldProvenance;
};

export type ProductProvenance = {
  readonly sourceLineIndices: readonly number[];
  readonly method: string;
  readonly confidence: number;
};

export type ParsedProductWithProvenance = ParsedProduct & {
  readonly provenance: ProductProvenance;
};

export type ReceiptDocument = {
  readonly rawLines: readonly string[];
  readonly products: readonly ParsedProductWithProvenance[];
  readonly charges: readonly ParsedCharge[];
  readonly discounts: readonly ParsedDiscount[];
  readonly footer: FooterData;
  readonly fuel: ExtractedFuel | null;
  readonly footerStartIndex: number;
  readonly extractionMs: number;
  readonly vatProvenance: FieldProvenance | null;
  readonly totalProvenance: FieldProvenance | null;
  readonly subtotalProvenance: FieldProvenance | null;
};

export type ExtractionTimings = {
  readonly extractionMs: number;
};
