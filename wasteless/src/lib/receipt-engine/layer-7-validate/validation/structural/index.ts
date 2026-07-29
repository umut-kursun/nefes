import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidatorResult } from "../../../types/models/validation";
import { validateReceiptTotal } from "./receiptTotalValidator";
import { validateSubtotal } from "./subtotalValidator";
import { validatePaymentSum } from "./paymentSumValidator";
import { validateVatSummary } from "./vatSummaryValidator";
import { validateLineTotals } from "./lineTotalValidator";
import { validateQuantities } from "./quantityValidator";
import { validateCharges } from "./chargeValidator";
import { validateDiscounts } from "./discountValidator";

export type StructuralValidator = (purchase: PurchaseDraft) => ValidatorResult;

export const STRUCTURAL_VALIDATORS: readonly StructuralValidator[] = [
  validateReceiptTotal,
  validateSubtotal,
  validatePaymentSum,
  validateVatSummary,
  validateLineTotals,
  validateQuantities,
  validateCharges,
  validateDiscounts,
];

export function runStructuralValidation(
  purchase: PurchaseDraft
): ValidatorResult[] {
  return STRUCTURAL_VALIDATORS.map((validator) => validator(purchase));
}
