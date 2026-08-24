import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "ApprovalCompletenessValidator";

/**
 * Expense-completeness gate for auto-approval.
 * Payment and VAT/tax metadata are optional — never block approval when absent.
 */
export function validateApprovalCompleteness(
  purchase: PurchaseDraft
): ValidatorResult {
  const issues: ValidationIssue[] = [];
  const isFuel = purchase.fuel != null;

  const meaningfulProducts = purchase.products.filter(
    (p) => p.name.trim().length >= 2 && !/^%\s*\d/.test(p.name.trim())
  );
  const pricedProducts = meaningfulProducts.filter((p) => p.lineTotal != null);

  if (meaningfulProducts.length === 0 && purchase.charges.length === 0 && !isFuel) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "APPROVAL_NO_PRODUCTS",
        severity: "ERROR",
        message: "Cannot approve without at least one product or charge line.",
        path: "products",
        purchase,
      })
    );
  }

  if (meaningfulProducts.length > 0 && pricedProducts.length === 0) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "APPROVAL_PRODUCT_PRICE_MISSING",
        severity: "ERROR",
        message:
          "Products were detected by name but no line totals could be extracted from OCR.",
        path: "products",
        purchase,
        suggestedFix: "Review product prices manually.",
      })
    );
  }

  if (purchase.total?.amount == null) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "APPROVAL_TOTAL_MISSING",
        severity: "ERROR",
        message: "Cannot approve without a receipt total.",
        path: "total",
        purchase,
      })
    );
  }

  if (isFuel) {
    if (!purchase.fuel?.fuelType) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "APPROVAL_FUEL_TYPE_MISSING",
          severity: "ERROR",
          message: "Fuel receipt is missing fuel type.",
          path: "fuel",
          purchase,
        })
      );
    }
    if (purchase.fuel?.liters == null) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "APPROVAL_FUEL_QTY_MISSING",
          severity: "ERROR",
          message: "Fuel receipt is missing quantity.",
          path: "fuel",
          purchase,
        })
      );
    }
  }

  return buildValidatorResult(ID, "structural", issues);
}
