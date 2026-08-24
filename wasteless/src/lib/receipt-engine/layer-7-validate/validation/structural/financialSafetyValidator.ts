import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue, nearlyEqual, sumAmounts } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "FinancialSafetyValidator";

/** Hard gate: broken financial state must never reach approved/valid. */
export function validateFinancialSafety(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];

  if (purchase.total?.amount == null) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "TOTAL_MISSING_BLOCKING",
        severity: "ERROR",
        message: "Receipt total is missing — analysis cannot be trusted.",
        path: "total",
        purchase,
        suggestedFix: "Review fiş total manually.",
      })
    );
  }

  const hasProductEvidence = purchase.products.some(
    (p) => p.name.trim().length >= 2 && !/^%\s*\d/.test(p.name.trim())
  );
  const hasChargeEvidence = purchase.charges.length > 0;
  const hasFuelEvidence = purchase.fuel != null;

  if (!hasProductEvidence && !hasChargeEvidence && !hasFuelEvidence) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "NO_EXTRACTED_LINES",
        severity: "ERROR",
        message: "No products or charges could be extracted from the receipt body.",
        path: "products",
        purchase,
      })
    );
  }

  if (purchase.payments.length > 0 && purchase.total?.amount != null) {
    const paymentSum = sumAmounts(purchase.payments.map((p) => p.amount));
    const total = purchase.total.amount;
    if (paymentSum > 0 && !nearlyEqual(paymentSum, total)) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "PAYMENT_TOTAL_INCOHERENT",
          severity: "ERROR",
          message: "Payment sum does not match receipt total.",
          path: "payments",
          expected: total,
          actual: paymentSum,
          purchase,
        })
      );
    }
  }

  for (const [index, product] of purchase.products.entries()) {
    if (/^%\s*\d/.test(product.name.trim())) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "VAT_RATE_AS_PRODUCT_NAME",
          severity: "ERROR",
          message: `Product line ${index + 1} looks like a VAT rate, not a product name.`,
          path: "products",
          index,
          field: "name",
          purchase,
        })
      );
    }
  }

  return buildValidatorResult(ID, "structural", issues);
}
