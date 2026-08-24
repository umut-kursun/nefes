import type { PurchaseDraft } from "../types/models/purchase";
import type {
  AnalysisStatus,
  ValidationReport,
  ValidatorResult,
} from "../types/models/validation";
import { clampConfidence } from "../types/provenance";
import { runStructuralValidation } from "./validation/structural";
import { runBusinessValidation } from "./validation/business";
import {
  clampScore,
  partitionIssues,
} from "./validation/scoring";
import {
  nearlyEqual,
  receiptReconciliationTolerance,
  sumAmounts,
} from "./validation/issueFactory";
import { reconciliationProducts } from "./validation/reconciliationProducts";

const BASE_SCORE = 100;

function computeFinancialConsistency(purchase: PurchaseDraft): boolean {
  const declared = purchase.total?.amount;
  if (declared == null) return false;

  const productSum = sumAmounts(
    reconciliationProducts(purchase).map((p) => p.lineTotal)
  );
  const chargeSum = sumAmounts(purchase.charges.map((c) => c.amount));
  const discountSum = sumAmounts(purchase.discounts.map((d) => d.amount));
  const expected = productSum + chargeSum + discountSum;

  if (
    productSum + chargeSum + Math.abs(discountSum) > 0 &&
    !nearlyEqual(expected, declared, receiptReconciliationTolerance(declared))
  ) {
    return false;
  }

  if (purchase.payments.length > 0) {
    const paymentSum = sumAmounts(purchase.payments.map((p) => p.amount));
    if (
      paymentSum > 0 &&
      !nearlyEqual(paymentSum, declared, receiptReconciliationTolerance(declared))
    ) {
      return false;
    }
  }

  return true;
}

function deriveAnalysisStatus(
  errors: readonly { severity: string; code: string }[],
  purchase: PurchaseDraft
): AnalysisStatus {
  if (errors.some((e) => e.severity === "CRITICAL")) return "failed";
  if (errors.length > 0) return "needs_review";
  if (purchase.total?.amount == null) return "needs_review";
  if (
    purchase.products.length === 0 &&
    purchase.charges.length === 0 &&
    purchase.fuel == null
  ) {
    return "needs_review";
  }
  return "approved";
}

export function buildValidationReport(purchase: PurchaseDraft): ValidationReport {
  const structural = runStructuralValidation(purchase);
  const business = runBusinessValidation(purchase);
  const contributions: ValidatorResult[] = [...structural, ...business];

  const allIssues = contributions.flatMap((c) => c.issues);
  const { errors, warnings, info } = partitionIssues(allIssues);

  const scoreImpact = contributions.reduce((sum, c) => sum + c.scoreImpact, 0);
  const confidenceImpact = contributions.reduce(
    (sum, c) => sum + c.confidenceImpact,
    0
  );

  const score = clampScore(BASE_SCORE + scoreImpact);
  const confidenceAdjustment = confidenceImpact;
  const overallConfidence = clampConfidence(
    purchase.confidence + confidenceAdjustment
  );

  const consistent = computeFinancialConsistency(purchase);
  const analysisStatus = deriveAnalysisStatus(errors, purchase);
  const isValid = analysisStatus === "approved";
  const blocking = analysisStatus !== "approved";

  return Object.freeze({
    isValid,
    consistent,
    analysisStatus,
    score,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    info: Object.freeze(info),
    confidenceAdjustment,
    overallConfidence,
    validatedPurchase: purchase,
    provenance: Object.freeze({
      purchaseConfidence: purchase.confidence,
      structuralValidators: Object.freeze(structural.map((s) => s.validatorId)),
      businessValidators: Object.freeze(business.map((b) => b.validatorId)),
      issueCount: allIssues.length,
    }),
    blocking,
  });
}
