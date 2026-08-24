import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "UnknownFieldValidator";

export function validateUnknownFields(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];

  purchase.products.forEach((line, index) => {
    if (line.lineTotal === undefined) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "business",
          code: "LINE_TOTAL_MISSING",
          severity: "WARNING",
          message: `Product "${line.name}" has no line total.`,
          path: "products",
          index,
          field: "lineTotal",
          purchase,
          graphNodeIds: line.provenance.graphNodeIds,
        })
      );
    }

    if (line.vatRate === undefined) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "business",
          code: "VAT_RATE_MISSING",
          severity: "INFO",
          message: `Product "${line.name}" has no VAT rate token.`,
          path: "products",
          index,
          field: "vatRate",
          purchase,
          graphNodeIds: line.provenance.graphNodeIds,
        })
      );
    }
  });

  if (purchase.products.length === 0) {
    const hasFinancialTotal =
      purchase.total?.amount != null && Number.isFinite(purchase.total.amount);
    const hasFuel = purchase.fuel != null;
    const hasCharges = purchase.charges.length > 0;

    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "NO_PRODUCTS",
        severity:
          hasFinancialTotal || hasFuel || hasCharges ? "ERROR" : "CRITICAL",
        message: hasFinancialTotal
          ? "Receipt total is present but product lines could not be extracted."
          : "Receipt contains no product lines.",
        path: "products",
        purchase,
      })
    );
  }

  return buildValidatorResult(ID, "business", issues);
}
