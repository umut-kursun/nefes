import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidatorResult } from "../../../types/models/validation";
import { validateFinancialSafety } from "./financialSafetyValidator";
import { validateReceiptTotal } from "./receiptTotalValidator";
import { validateSubtotal } from "./subtotalValidator";
import { validatePaymentSum } from "./paymentSumValidator";
import { validateVatSummary } from "./vatSummaryValidator";
import { validateLineTotals } from "./lineTotalValidator";
import { validateQuantities } from "./quantityValidator";
import { validateCharges } from "./chargeValidator";
import { validateDiscounts } from "./discountValidator";
import { validateDateTime } from "./dateTimeValidator";
import { validateCategoryAuthority } from "./categoryAuthorityValidator";
import { validateMerchantAuthority } from "./merchantAuthorityValidator";
import { validateApprovalCompleteness } from "./approvalCompletenessValidator";
import { validateSemanticIntegrity } from "./semanticIntegrityValidator";

export type StructuralValidator = (purchase: PurchaseDraft) => ValidatorResult;

export const STRUCTURAL_VALIDATORS: readonly StructuralValidator[] = [
  validateFinancialSafety,
  validateSemanticIntegrity,
  validateDateTime,
  validateMerchantAuthority,
  validateCategoryAuthority,
  validateReceiptTotal,
  validateSubtotal,
  validatePaymentSum,
  validateVatSummary,
  validateLineTotals,
  validateQuantities,
  validateCharges,
  validateDiscounts,
  validateApprovalCompleteness,
];

export function runStructuralValidation(
  purchase: PurchaseDraft
): ValidatorResult[] {
  return STRUCTURAL_VALIDATORS.map((validator) => validator(purchase));
}
