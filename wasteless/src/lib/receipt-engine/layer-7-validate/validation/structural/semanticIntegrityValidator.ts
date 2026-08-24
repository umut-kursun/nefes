import type { PurchaseDraft } from "../../../types/models/purchase";
import type { ValidationIssue, ValidatorResult } from "../../../types/models/validation";
import {
  BARE_AMOUNT_AS_NAME,
  isPollutedProductName,
  LEGAL_ENTITY_MERCHANT,
  VAT_AS_PRODUCT_NAME,
} from "@/lib/receipt-accuracy-contract/patterns";
import { CATEGORY_SUBTOTAL_LABEL } from "@/lib/receipt-engine-v2/extraction/assignLineRoles";
import { createIssue } from "../issueFactory";
import { buildValidatorResult } from "../scoring";
import {
  reconciliationProducts,
} from "../reconciliationProducts";

const ID = "SemanticIntegrityValidator";

function isCategorySubtotalProductName(name: string): boolean {
  const trimmed = name.trim();
  if (!CATEGORY_SUBTOTAL_LABEL.test(trimmed)) return false;
  const remainder = trimmed
    .replace(CATEGORY_SUBTOTAL_LABEL, "")
    .replace(/%\s*\d+(?:[.,]\d+)?/g, "")
    .trim();
  return remainder.length < 3;
}

/**
 * Blocks approval when product list contains header/metadata pollution or
 * other semantically invalid product rows.
 */
export function validateSemanticIntegrity(purchase: PurchaseDraft): ValidatorResult {
  const issues: ValidationIssue[] = [];

  const merchant = purchase.merchant?.trim() ?? "";
  if (merchant && LEGAL_ENTITY_MERCHANT.test(merchant)) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "SEMANTIC_MERCHANT_LEGAL_ENTITY",
        severity: "ERROR",
        message: "Merchant name looks like a legal entity, not a consumer-facing store name.",
        path: "merchant",
        purchase,
      })
    );
  }

  if (!merchant) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "SEMANTIC_MERCHANT_MISSING",
        severity: "ERROR",
        message: "Merchant name is missing — cannot approve without store identity.",
        path: "merchant",
        purchase,
      })
    );
  }

  for (const [index, product] of purchase.products.entries()) {
    const name = product.name.trim();

    if (!name) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "SEMANTIC_EMPTY_PRODUCT_NAME",
          severity: "ERROR",
          message: `Product line ${index + 1} has an empty name.`,
          path: "products",
          index,
          field: "name",
          purchase,
        })
      );
      continue;
    }

    if (isPollutedProductName(name)) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "SEMANTIC_PRODUCT_POLLUTION",
          severity: "ERROR",
          message: `Product line ${index + 1} contains header or metadata text: "${name.slice(0, 48)}".`,
          path: "products",
          index,
          field: "name",
          purchase,
        })
      );
    }

    if (VAT_AS_PRODUCT_NAME.test(name)) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "SEMANTIC_VAT_AS_PRODUCT",
          severity: "ERROR",
          message: `Product line ${index + 1} is a VAT rate token, not a product name.`,
          path: "products",
          index,
          field: "name",
          purchase,
        })
      );
    }

    if (BARE_AMOUNT_AS_NAME.test(name)) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "SEMANTIC_BARE_AMOUNT_AS_PRODUCT",
          severity: "ERROR",
          message: `Product line ${index + 1} is a bare amount, not a product name.`,
          path: "products",
          index,
          field: "name",
          purchase,
        })
      );
    }

    if (isCategorySubtotalProductName(name)) {
      const otherProducts = purchase.products.filter(
        (p, i) =>
          i !== index &&
          p.name.trim().length >= 2 &&
          !isCategorySubtotalProductName(p.name)
      );
      if (otherProducts.length > 0) {
        issues.push(
          createIssue({
            validatorId: ID,
            category: "structural",
            code: "SEMANTIC_CATEGORY_SUBTOTAL_AS_PRODUCT",
            severity: "ERROR",
            message: `Product line ${index + 1} is a category subtotal label, not a product.`,
            path: "products",
            index,
            field: "name",
            purchase,
          })
        );
      }
    }

    if (
      product.provenance.classificationRules?.[0] === "semantic:product-name-only" &&
      product.lineTotal == null
    ) {
      issues.push(
        createIssue({
          validatorId: ID,
          category: "structural",
          code: "SEMANTIC_NAME_ONLY_HEADER_ROW",
          severity: "ERROR",
          message: `Product line ${index + 1} is a name-only row without price evidence.`,
          path: "products",
          index,
          field: "name",
          purchase,
        })
      );
    }
  }

  const nonEmptyProducts = purchase.products.filter((p) => p.name.trim().length >= 2);
  if (
    nonEmptyProducts.length > 0 &&
    nonEmptyProducts.every((p) => isCategorySubtotalProductName(p.name))
  ) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "SEMANTIC_CATEGORY_LABEL_ONLY_PRODUCTS",
        severity: "ERROR",
        message:
          "All extracted products are category summary labels (e.g. YİYECEK/İÇECEK) — item detail is required before approval.",
        path: "products",
        purchase,
      })
    );
  }

  const meaningfulProducts = purchase.products.filter(
    (p) => p.name.trim().length >= 2 && !isPollutedProductName(p.name.trim())
  );
  const pricedProducts = meaningfulProducts.filter((p) => p.lineTotal != null);
  const eligible = reconciliationProducts(purchase);

  if (
    meaningfulProducts.length > 0 &&
    pricedProducts.length > 0 &&
    eligible.length === 0
  ) {
    issues.push(
      createIssue({
        validatorId: ID,
        category: "structural",
        code: "SEMANTIC_NO_RECONCILIATION_ELIGIBLE",
        severity: "ERROR",
        message:
          "Products were extracted but none are eligible for total reconciliation.",
        path: "products",
        purchase,
      })
    );
  }

  return buildValidatorResult(ID, "structural", issues);
}
