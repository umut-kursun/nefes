import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "MetadataCompletenessValidator";

export function validateMetadataCompleteness(
  purchase: PurchaseDraft
): ValidatorResult {
  const issues: ValidationIssue[] = [];
  const fields = [
    { key: "merchant", present: Boolean(purchase.merchant) },
    { key: "purchaseDate", present: Boolean(purchase.purchaseDate) },
    { key: "purchaseTime", present: Boolean(purchase.purchaseTime) },
    { key: "receiptNumber", present: Boolean(purchase.receiptNumber) },
    { key: "currency", present: Boolean(purchase.currency) },
  ];

  const missing = fields.filter((f) => !f.present).map((f) => f.key);
  const completeness = (fields.length - missing.length) / fields.length;

  if (completeness < 0.4) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "METADATA_SPARSE",
        severity: "WARNING",
        message: `Receipt metadata is sparse (missing: ${missing.join(", ")}).`,
        path: "metadata",
        purchase,
      })
    );
  } else if (missing.length > 0) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "business",
        code: "METADATA_PARTIAL",
        severity: "INFO",
        message: `Some metadata fields are missing: ${missing.join(", ")}.`,
        path: "metadata",
        purchase,
      })
    );
  }

  return buildValidatorResult(ID, "business", issues);
}
