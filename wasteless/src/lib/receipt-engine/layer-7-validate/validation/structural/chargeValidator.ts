import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "ChargeValidator";

export function validateCharges(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];

  purchase.charges.forEach((charge, index) => {
    if (charge.amount === undefined) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "CHARGE_AMOUNT_MISSING",
          severity: "WARNING",
          message: `Charge "${charge.label}" has no amount.`,
          path: "charges",
          index,
          field: "amount",
          purchase,
          graphNodeIds: charge.provenance.graphNodeIds,
        })
      );
      return;
    }

    if (charge.amount < 0) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "NEGATIVE_CHARGE",
          severity: "ERROR",
          message: `Charge "${charge.label}" has a negative amount.`,
          path: "charges",
          index,
          field: "amount",
          actual: charge.amount,
          purchase,
          graphNodeIds: charge.provenance.graphNodeIds,
        })
      );
    }
  });

  return buildValidatorResult(ID, "structural", issues);
}
