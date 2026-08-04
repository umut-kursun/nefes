export type ReceiptProfile =
  | "generic"
  | "market"
  | "fuel"
  | "restaurant"
  | "cafe"
  | "pos-slip"
  | "e-arsiv"
  | "unknown";

export type FieldConfidence = {
  readonly value: number;
  readonly reasons: readonly string[];
};

export type ProductEntity = {
  readonly name: string;
  readonly quantity?: number;
  readonly unit?: string;
  readonly unitPrice?: number;
  readonly lineTotal?: number;
  readonly vatRate?: number;
  readonly confidence: FieldConfidence;
};

export type LabeledAmount = {
  readonly label: string;
  readonly amount?: number;
  readonly confidence: FieldConfidence;
};

export type NormalizedPurchase = {
  readonly merchant: string | null;
  readonly merchantConfidence: FieldConfidence;
  readonly purchaseDate: string | null;
  readonly dateConfidence: FieldConfidence;
  readonly purchaseTime: string | null;
  readonly timeConfidence: FieldConfidence;
  readonly receiptNumber: string | null;
  readonly receiptNumberConfidence: FieldConfidence;
  readonly currency: string | null;
  readonly products: readonly ProductEntity[];
  readonly charges: readonly LabeledAmount[];
  readonly discounts: readonly LabeledAmount[];
  readonly payments: readonly LabeledAmount[];
  readonly vatSummary: readonly LabeledAmount[];
  readonly subtotal: LabeledAmount | null;
  readonly total: LabeledAmount | null;
  readonly profile: ReceiptProfile;
};

export type PurchaseGraph = {
  readonly profile: ReceiptProfile;
  readonly purchase: NormalizedPurchase;
};

export type ValidationIssue = {
  readonly code: string;
  readonly message: string;
  readonly severity: "error" | "warning" | "info";
};

export type ValidationReport = {
  readonly issues: readonly ValidationIssue[];
  readonly score: number;
};

export type PipelineDebug = {
  readonly rawLines: readonly import("./raw-line").RawLine[];
  readonly layoutBlocks: readonly import("./layout-block").LayoutBlock[];
  readonly semanticBlocks: readonly import("./semantic-block").SemanticBlock[];
  readonly graph: PurchaseGraph;
  readonly validation: ValidationReport;
};

export type PipelineResult = {
  readonly purchase: NormalizedPurchase;
  readonly validation: ValidationReport;
  readonly profile: ReceiptProfile;
  readonly debug?: PipelineDebug;
};
