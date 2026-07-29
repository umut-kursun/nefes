import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "ReceiptNumberValidator";

export function validateReceiptNumber(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];

  if (!purchase.receiptNumber) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "RECEIPT_NUMBER_MISSING",
        severity: "INFO",
        message: "Receipt number is not present.",
        path: "receiptNumber",
        purchase,
      })
    );
    return buildValidatorResult(ID, "business", issues);
  }

  if (!purchase.receiptNumber.normalized) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "RECEIPT_NUMBER_NOT_NORMALIZED",
        severity: "INFO",
        message: "Receipt number could not be normalized.",
        path: "receiptNumber.raw",
        purchase,
      })
    );
  }

  return buildValidatorResult(ID, "business", issues);
}
