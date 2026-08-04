import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "QuantityValidator";

export function validateQuantities(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];

  purchase.products.forEach((line, index) => {
    if (line.quantity == null) return;

    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "INVALID_QUANTITY",
          severity: "ERROR",
          message: `Invalid quantity for "${line.name}".`,
          path: "products",
          index,
          field: "quantity",
          actual: line.quantity,
          purchase,
          graphNodeIds: line.provenance.graphNodeIds,
          suggestedFix: "Verify quantity token parsing.",
        })
      );
    }
  });

  return buildValidatorResult(ID, "structural", issues);
}
