import type { PurchaseDraft } from "../types/models/purchase";
import type {
  ValidationReport,
  ValidatorResult,
} from "../types/models/validation";
import { clampConfidence } from "../types/provenance";
import { runStructuralValidation } from "./validation/structural";
import { runBusinessValidation } from "./validation/business";
import {
  clampScore,
  isReportValid,
  partitionIssues,
} from "./validation/scoring";

const BASE_SCORE = 100;

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

  const isValid = isReportValid(errors);
  const blocking = errors.some((e) => e.severity === "CRITICAL");

  return Object.freeze({
    isValid,
    consistent: isValid,
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
