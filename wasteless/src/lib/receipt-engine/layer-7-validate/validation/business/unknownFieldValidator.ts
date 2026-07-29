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
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "NO_PRODUCTS",
        severity: "CRITICAL",
        message: "Receipt contains no product lines.",
        path: "products",
        purchase,
      })
    );
  }

  return buildValidatorResult(ID, "business", issues);
}
