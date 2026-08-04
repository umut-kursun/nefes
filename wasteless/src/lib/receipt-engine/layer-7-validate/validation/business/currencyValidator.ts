import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const KNOWN_CURRENCIES = new Set(["TRY", "USD", "EUR", "GBP"]);

const ID = "CurrencyValidator";

export function validateCurrency(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];
  const currency = purchase.currency;

  const inferredTry =
    !currency &&
    (purchase.receiptNumber ||
      purchase.merchant ||
      purchase.products.length > 0);

  if (!currency) {
    if (inferredTry) {
      return buildValidatorResult(ID, "business", issues);
    }
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "CURRENCY_MISSING",
        severity: "WARNING",
        message: "Currency is not declared on the receipt.",
        path: "currency",
        purchase,
      })
    );
    return buildValidatorResult(ID, "business", issues);
  }

  if (!currency.normalized) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "CURRENCY_UNKNOWN",
        severity: "WARNING",
        message: `Currency token "${currency.raw}" is not recognized.`,
        path: "currency.raw",
        purchase,
      })
    );
  } else if (!KNOWN_CURRENCIES.has(currency.normalized)) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "CURRENCY_UNSUPPORTED",
        severity: "INFO",
        message: `Currency code "${currency.normalized}" is not in the known set.`,
        path: "currency.normalized",
        purchase,
      })
    );
  }

  return buildValidatorResult(ID, "business", issues);
}
