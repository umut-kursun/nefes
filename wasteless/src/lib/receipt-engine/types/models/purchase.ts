import type { Confidence } from "../provenance";
import type { SemanticKind } from "./classify";

/** Raw OCR value with optional deterministic normalization. */
export interface ParsedField<T = string> {
  readonly raw: string;
  readonly normalized?: T;
}

export interface PurchaseLineProvenance {
  readonly productBlockId: string;
  readonly graphNodeIds: readonly string[];
  readonly layoutLineIndices: readonly number[];
  readonly rawTexts: readonly string[];
  readonly ocrTexts: readonly string[];
  readonly classificationRules: readonly string[];
  readonly confidence: Confidence;
}

/** One product line — exactly one ProductBlock. */
export interface PurchaseLine {
  readonly name: string;
  readonly quantity?: number | null;
  readonly unit?: string;
  readonly unitPrice?: number;
  readonly lineTotal?: number;
  readonly baseUnit?: "L" | "kg" | "ad";
  readonly normalizedUnitPrice?: number;
  readonly variantSize?: string | null;
  readonly productKey?: string;
  readonly vatRate?: number;
  readonly confidence: Confidence;
  readonly provenance: PurchaseLineProvenance;
}

export interface PurchaseFooterLineProvenance {
  readonly footerBlockId: string;
  readonly graphNodeIds: readonly string[];
  readonly semanticKind: SemanticKind;
  readonly confidence: Confidence;
}

export interface PurchaseFooterLine {
  readonly label: string;
  readonly amount?: number;
  readonly confidence: Confidence;
  readonly provenance: PurchaseFooterLineProvenance;
}

export interface PurchaseDraftProvenance {
  readonly metadataBlockId: string;
  readonly footerBlockId: string;
  readonly blockDocumentConfidence: Confidence;
  readonly rawTexts: readonly string[];
}

/** Fuel metadata from vision parser or product-line inference. */
export interface PurchaseFuelMetadata {
  readonly fuelType: string | null;
  readonly liters: number | null;
  readonly pricePerLiter: number | null;
  readonly plateNumber: string | null;
  readonly stationName: string | null;
}

/** Layer 6 output — canonical receipt understanding (no AI, no inference). */
export interface PurchaseDraft {
  readonly merchant: string | null;
  readonly purchaseDate: ParsedField<string> | null;
  readonly purchaseTime: ParsedField<string> | null;
  readonly receiptNumber: ParsedField<string> | null;
  readonly currency: ParsedField<string> | null;
  readonly products: readonly PurchaseLine[];
  readonly charges: readonly PurchaseFooterLine[];
  readonly discounts: readonly PurchaseFooterLine[];
  readonly payments: readonly PurchaseFooterLine[];
  readonly vatSummary: readonly PurchaseFooterLine[];
  readonly subtotal: PurchaseFooterLine | null;
  readonly total: PurchaseFooterLine | null;
  readonly confidence: Confidence;
  readonly provenance: PurchaseDraftProvenance;
  readonly fuel?: PurchaseFuelMetadata | null;
}

export function emptyPurchaseDraft(): PurchaseDraft {
  return Object.freeze({
    merchant: null,
    purchaseDate: null,
    purchaseTime: null,
    receiptNumber: null,
    currency: null,
    products: Object.freeze([]),
    charges: Object.freeze([]),
    discounts: Object.freeze([]),
    payments: Object.freeze([]),
    vatSummary: Object.freeze([]),
    subtotal: null,
    total: null,
    confidence: 0,
    provenance: Object.freeze({
      metadataBlockId: "metadata:empty",
      footerBlockId: "footer:empty",
      blockDocumentConfidence: 0,
      rawTexts: Object.freeze([]),
    }),
  });
}
