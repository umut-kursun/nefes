import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "AnomalyValidator";

export function validateAnomalies(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];

  const labels = purchase.payments.map((p) => p.label.trim().toLowerCase());
  const seen = new Set<string>();
  purchase.payments.forEach((payment, index) => {
    const key = payment.label.trim().toLowerCase();
    if (seen.has(key)) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "business",
          code: "DUPLICATE_PAYMENT",
          severity: "WARNING",
          message: `Duplicate payment label "${payment.label}".`,
          path: "payments",
          index,
          field: "label",
          purchase,
          graphNodeIds: payment.provenance.graphNodeIds,
        })
      );
    }
    seen.add(key);
  });

  if (purchase.total?.amount === 0) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "ZERO_TOTAL",
        severity: "WARNING",
        message: "Receipt total is zero.",
        path: "total.amount",
        purchase,
        graphNodeIds: purchase.total?.provenance.graphNodeIds,
      })
    );
  }

  if (labels.length >= 2 && purchase.payments.every((p) => p.amount === purchase.total?.amount)) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "SPLIT_PAYMENT_ANOMALY",
        severity: "INFO",
        message: "Multiple payments each match the full total — verify split payment parsing.",
        path: "payments",
        purchase,
      })
    );
  }

  return buildValidatorResult(ID, "business", issues);
}
