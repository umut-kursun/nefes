import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";
import { nearlyEqual, sumAmounts } from "../issueFactory";

const ID = "ReceiptTotalValidator";

export function validateReceiptTotal(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];
  const productSum = sumAmounts(purchase.products.map((p) => p.lineTotal));
  const chargeSum = sumAmounts(purchase.charges.map((c) => c.amount));
  const discountSum = sumAmounts(purchase.discounts.map((d) => d.amount));
  const expected = productSum + chargeSum + discountSum;
  const declared = purchase.total?.amount;

  if (declared === undefined) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "TOTAL_MISSING",
        severity: "WARNING",
        message: "Receipt total is not declared.",
        path: "total",
        purchase,
        graphNodeIds: purchase.total?.provenance.graphNodeIds,
        suggestedFix: "Ensure footer total row is parsed.",
      })
    );
    return buildValidatorResult(ID, "structural", issues);
  }

  if (!nearlyEqual(expected, declared)) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "TOTAL_MISMATCH",
        severity: "ERROR",
        message: "Declared total does not match product, charge, and discount sums.",
        path: "total.amount",
        expected,
        actual: declared,
        purchase,
        graphNodeIds: purchase.total?.provenance.graphNodeIds,
        suggestedFix: "Review line totals, charges, and discounts against footer total.",
      })
    );
  }

  return buildValidatorResult(ID, "structural", issues);
}
