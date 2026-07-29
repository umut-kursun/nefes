import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue, nearlyEqual, sumAmounts } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "PaymentSumValidator";

export function validatePaymentSum(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];
  if (purchase.payments.length === 0) {
    return buildValidatorResult(ID, "structural", issues);
  }

  const paymentSum = sumAmounts(purchase.payments.map((p) => p.amount));
  const total = purchase.total?.amount;

  if (total === undefined) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "PAYMENT_WITHOUT_TOTAL",
        severity: "WARNING",
        message: "Payments are present but receipt total is missing.",
        path: "payments",
        purchase,
      })
    );
    return buildValidatorResult(ID, "structural", issues);
  }

  if (!nearlyEqual(paymentSum, total)) {
    const severity = paymentSum > total ? "WARNING" : "ERROR";
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "PAYMENT_SUM_MISMATCH",
        severity,
        message:
          severity === "WARNING"
            ? "Payment sum exceeds total — may include cash change."
            : "Payment sum does not match receipt total.",
        path: "payments",
        expected: total,
        actual: paymentSum,
        purchase,
        suggestedFix:
          severity === "WARNING"
            ? "Verify cash payment includes change amount."
            : "Check split payment rows against total.",
      })
    );
  }

  return buildValidatorResult(ID, "structural", issues);
}
