import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import {
  ADDRESS_LIKE_MERCHANT,
  LEGAL_ENTITY_MERCHANT,
} from "@/lib/receipt-accuracy-contract/patterns";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";

const ID = "MerchantAuthorityValidator";

const BRAND_TOKEN =
  /(?:MARKET|MIGROS|PETROL|KAHVE|CAFE|GIDA|HED[İI]YEL|T[İI]K[İI]|BEACH|ŞENGÜL|ÇEHRE|ALTIN|FILE|OPET|SHELL|ÖZY[İI]LD[İI]Z)/i;

/** Merchant must be a consumer-facing brand — not address, tax, or legal boilerplate. */
export function validateMerchantAuthority(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];
  const merchant = purchase.merchant?.trim() ?? "";

  if (!merchant) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "MERCHANT_MISSING",
        severity: "ERROR",
        message: "Merchant name is missing — review required.",
        path: "merchant",
        purchase,
      })
    );
    return buildValidatorResult(ID, "structural", issues);
  }

  if (ADDRESS_LIKE_MERCHANT.test(merchant)) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "MERCHANT_ADDRESS_LIKE",
        severity: "ERROR",
        message: `Merchant "${merchant}" looks like an address, not a store name.`,
        path: "merchant",
        purchase,
      })
    );
  }

  if (LEGAL_ENTITY_MERCHANT.test(merchant) && !BRAND_TOKEN.test(merchant)) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "MERCHANT_LEGAL_ENTITY_ONLY",
        severity: "ERROR",
        message: `Merchant "${merchant}" looks like legal entity boilerplate without a brand.`,
        path: "merchant",
        purchase,
      })
    );
  }

  return buildValidatorResult(ID, "structural", issues);
}
