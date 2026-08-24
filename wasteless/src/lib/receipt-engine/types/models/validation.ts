import type { Confidence } from "../provenance";
import type { PurchaseDraft } from "./purchase";

export type ValidationSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export type ValidationCategory = "structural" | "business";

export type ValidationPhase = ValidationCategory;

export interface ValidationLocation {
  readonly path: string;
  readonly index?: number;
  readonly field?: string;
}

export interface ValidationIssueProvenance {
  readonly validatorId: string;
  readonly purchaseConfidence: Confidence;
  readonly graphNodeIds?: readonly string[];
}

export interface ValidationIssue {
  readonly id: string;
  readonly severity: ValidationSeverity;
  readonly category: ValidationCategory;
  readonly code: string;
  readonly message: string;
  readonly location: ValidationLocation;
  readonly provenance: ValidationIssueProvenance;
  readonly suggestedFix?: string;
  readonly expected?: number;
  readonly actual?: number;
}

export interface ValidationReportProvenance {
  readonly purchaseConfidence: Confidence;
  readonly structuralValidators: readonly string[];
  readonly businessValidators: readonly string[];
  readonly issueCount: number;
}

export type AnalysisStatus = "approved" | "needs_review" | "failed";

export interface ValidationReport {
  readonly isValid: boolean;
  /** Financial reconciliation passed (independent of approval gate). */
  readonly consistent: boolean;
  readonly analysisStatus: AnalysisStatus;
  readonly score: number;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly info: readonly ValidationIssue[];
  readonly confidenceAdjustment: number;
  /** @deprecated Use score normalized */
  readonly overallConfidence: Confidence;
  readonly validatedPurchase: PurchaseDraft;
  readonly provenance: ValidationReportProvenance;
  readonly blocking: boolean;
}

export interface ValidatorResult {
  readonly validatorId: string;
  readonly phase: ValidationPhase;
  readonly issues: readonly ValidationIssue[];
  readonly scoreImpact: number;
  readonly confidenceImpact: number;
}

export function emptyValidationReport(
  purchase?: PurchaseDraft
): ValidationReport {
  const draft = purchase ?? {
    merchant: null,
    purchaseDate: null,
    purchaseTime: null,
    receiptNumber: null,
    currency: null,
    products: [],
    charges: [],
    discounts: [],
    payments: [],
    vatSummary: [],
    subtotal: null,
    total: null,
    confidence: 0,
    provenance: {
      metadataBlockId: "metadata:empty",
      footerBlockId: "footer:empty",
      blockDocumentConfidence: 0,
      rawTexts: [],
    },
  };

  return {
    isValid: true,
    consistent: true,
    analysisStatus: "approved",
    score: 100,
    errors: [],
    warnings: [],
    info: [],
    confidenceAdjustment: 0,
    overallConfidence: 1,
    validatedPurchase: draft,
    provenance: {
      purchaseConfidence: draft.confidence,
      structuralValidators: [],
      businessValidators: [],
      issueCount: 0,
    },
    blocking: false,
  };
}
