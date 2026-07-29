import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "DateValidator";

export function validateDate(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];
  const date = purchase.purchaseDate;

  if (!date) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "DATE_MISSING",
        severity: "WARNING",
        message: "Purchase date is not present.",
        path: "purchaseDate",
        purchase,
      })
    );
    return buildValidatorResult(ID, "business", issues);
  }

  if (!date.normalized) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "DATE_NOT_NORMALIZED",
        severity: "INFO",
        message: "Purchase date could not be normalized deterministically.",
        path: "purchaseDate.raw",
        purchase,
        suggestedFix: "Verify date format in OCR text.",
      })
    );
  }

  return buildValidatorResult(ID, "business", issues);
}
