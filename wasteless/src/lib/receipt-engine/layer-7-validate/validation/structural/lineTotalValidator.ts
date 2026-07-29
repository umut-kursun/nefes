import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue, nearlyEqual } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "LineTotalValidator";

export function validateLineTotals(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];

  purchase.products.forEach((line, index) => {
    if (
      line.quantity === undefined ||
      line.unitPrice === undefined ||
      line.lineTotal === undefined
    ) {
      return;
    }

    const expected = line.quantity * line.unitPrice;
    if (!nearlyEqual(expected, line.lineTotal)) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "LINE_TOTAL_MISMATCH",
          severity: "ERROR",
          message: `Line total for "${line.name}" does not match quantity × unit price.`,
          path: "products",
          index,
          field: "lineTotal",
          expected,
          actual: line.lineTotal,
          purchase,
          graphNodeIds: line.provenance.graphNodeIds,
        })
      );
    }
  });

  return buildValidatorResult(ID, "structural", issues);
}
