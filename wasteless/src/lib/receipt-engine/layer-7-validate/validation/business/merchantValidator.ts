import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "MerchantValidator";

export function validateMerchant(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];
  const merchant = purchase.merchant?.trim();

  if (!merchant) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "MERCHANT_MISSING",
        severity: "WARNING",
        message: "Merchant name is not present.",
        path: "merchant",
        purchase,
        suggestedFix: "Check header region classification.",
      })
    );
  } else if (merchant.length < 2) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "MERCHANT_TOO_SHORT",
        severity: "INFO",
        message: "Merchant name is unusually short.",
        path: "merchant",
        purchase,
      })
    );
  }

  return buildValidatorResult(ID, "business", issues);
}
