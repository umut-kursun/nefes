import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "DiscountValidator";

export function validateDiscounts(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];

  purchase.discounts.forEach((discount, index) => {
    if (discount.amount === undefined) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "DISCOUNT_AMOUNT_MISSING",
          severity: "WARNING",
          message: `Discount "${discount.label}" has no amount.`,
          path: "discounts",
          index,
          field: "amount",
          purchase,
          graphNodeIds: discount.provenance.graphNodeIds,
        })
      );
      return;
    }

    if (discount.amount > 0) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "POSITIVE_DISCOUNT",
          severity: "ERROR",
          message: `Discount "${discount.label}" should be zero or negative.`,
          path: "discounts",
          index,
          field: "amount",
          actual: discount.amount,
          purchase,
          graphNodeIds: discount.provenance.graphNodeIds,
          suggestedFix: "Discount amounts are typically negative or zero.",
        })
      );
    }
  });

  return buildValidatorResult(ID, "structural", issues);
}
