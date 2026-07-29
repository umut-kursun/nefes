import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue, nearlyEqual, sumAmounts } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "SubtotalValidator";

export function validateSubtotal(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];
  const subtotal = purchase.subtotal?.amount;
  if (subtotal === undefined) {
    return buildValidatorResult(ID, "structural", issues);
  }

  const productSum = sumAmounts(purchase.products.map((p) => p.lineTotal));
  if (!nearlyEqual(productSum, subtotal)) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "SUBTOTAL_MISMATCH",
        severity: "ERROR",
        message: "Subtotal does not match sum of product line totals.",
        path: "subtotal.amount",
        expected: productSum,
        actual: subtotal,
        purchase,
        graphNodeIds: purchase.subtotal?.provenance.graphNodeIds,
      })
    );
  }

  return buildValidatorResult(ID, "structural", issues);
}
