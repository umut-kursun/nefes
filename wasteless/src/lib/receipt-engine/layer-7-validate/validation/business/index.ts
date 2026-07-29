import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidatorResult } from "../../../types/models/validation";
import { validateMerchant } from "./merchantValidator";
import { validateDate } from "./dateValidator";
import { validateCurrency } from "./currencyValidator";
import { validateReceiptNumber } from "./receiptNumberValidator";
import { validateMetadataCompleteness } from "./metadataCompletenessValidator";
import { validateUnknownFields } from "./unknownFieldValidator";
import { validateAnomalies } from "./anomalyValidator";

export type BusinessValidator = (purchase: PurchaseDraft) => ValidatorResult;

/** Business validators — quality checks only, no mathematical totals. */
export const BUSINESS_VALIDATORS: readonly BusinessValidator[] = [
  validateMerchant,
  validateDate,
  validateCurrency,
  validateReceiptNumber,
  validateMetadataCompleteness,
  validateUnknownFields,
  validateAnomalies,
];

export function runBusinessValidation(
  purchase: PurchaseDraft
): ValidatorResult[] {
  return BUSINESS_VALIDATORS.map((validator) => validator(purchase));
}
