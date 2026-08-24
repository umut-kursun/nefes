import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import { parseDate } from "@/lib/receipt-engine/layer-6-purchase/parsers/dateParser";
import { parseTime } from "@/lib/receipt-engine/layer-6-purchase/parsers/timeParser";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "DateTimeValidator";

/** Reject impossible dates/times before approval — parseDate/parseTime are authoritative. */
export function validateDateTime(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];

  const dateRaw = purchase.purchaseDate?.raw?.trim();
  if (dateRaw) {
    const parsed = parseDate(dateRaw);
    if (!parsed.normalized) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "INVALID_RECEIPT_DATE",
          severity: "ERROR",
          message: `Receipt date "${dateRaw}" could not be normalized to a valid ISO date.`,
          path: "purchaseDate",
          purchase,
        })
      );
    } else if (
      purchase.purchaseDate?.normalized &&
      purchase.purchaseDate.normalized !== parsed.normalized
    ) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "DATE_NORMALIZATION_MISMATCH",
          severity: "ERROR",
          message: `Stored purchase date normalization disagrees with parseDate (expected ${parsed.normalized}, actual ${purchase.purchaseDate.normalized}).`,
          path: "purchaseDate",
          purchase,
        })
      );
    }
  }

  const timeRaw = purchase.purchaseTime?.raw?.trim();
  if (timeRaw) {
    const parsed = parseTime(timeRaw);
    if (!parsed.normalized) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "INVALID_RECEIPT_TIME",
          severity: "ERROR",
          message: `Receipt time "${timeRaw}" could not be normalized.`,
          path: "purchaseTime",
          purchase,
        })
      );
    }
  }

  return buildValidatorResult(ID, "structural", issues);
}
