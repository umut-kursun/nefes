import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue, sumAmounts } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "VatSummaryValidator";

export function validateVatSummary(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];

  purchase.vatSummary.forEach((row, index) => {
    if (row.amount === undefined) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "VAT_AMOUNT_MISSING",
          severity: "WARNING",
          message: `VAT summary row "${row.label}" has no amount.`,
          path: "vatSummary",
          index,
          field: "amount",
          purchase,
          graphNodeIds: row.provenance.graphNodeIds,
        })
      );
    }
  });

  const total = purchase.total?.amount;
  const vatSum = sumAmounts(purchase.vatSummary.map((v) => v.amount));
  if (total !== undefined && vatSum > total + 0.02) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "VAT_EXCEEDS_TOTAL",
        severity: "ERROR",
        message: "VAT summary sum exceeds receipt total.",
        path: "vatSummary",
        expected: total,
        actual: vatSum,
        purchase,
      })
    );
  }

  return buildValidatorResult(ID, "structural", issues);
}
