import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { classifyPurchaseCategory } from "@/lib/receipt-engine-v2/classification/categoryClassifier";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "CategoryAuthorityValidator";

/** Category must reflect purchase domain — never silently trust weak market default. */
export function validateCategoryAuthority(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];
  const ocrText = purchase.provenance.rawTexts.join("\n");
  const hasFuel = purchase.fuel != null;

  const classification = classifyPurchaseCategory(purchase, ocrText, hasFuel);

  if (classification.confidence === "low") {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "CATEGORY_UNCERTAIN",
        severity: "ERROR",
        message: `Category assignment is uncertain (${classification.reason}) — review required.`,
        path: "category",
        purchase,
        suggestedFix: "Confirm expense category manually.",
      })
    );
  }

  return buildValidatorResult(ID, "structural", issues);
}
