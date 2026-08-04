import type { ParsedReceipt, ReceiptItem } from "../types/ParsedReceipt";

import { applyProductLineVatRates } from "./applyProductLineVatRate";

import { bindPosLineQuantities } from "./bindPosLineQuantities";

import { bindUpperLineQuantities } from "./bindUpperLineQuantities";

import { disambiguatePosFooter } from "./disambiguatePosFooter";

import { mergeStandaloneMultiplierProducts } from "./mergeStandaloneMultiplierProducts";

import {
  attachMigrosMultiplierMetadata,
  dedupeMigrosPlasticBag,
  findExplicitQuantityForProduct,
  isMigrosReceipt,
  recoverSplitMigrosProducts,
} from "./migrosReceiptRules";

import { normalizeVisionProductNames } from "./normalizeVisionProductNames";

import { sanitizeHallucinatedQuantities } from "./parsedReceiptReconcile";

import {

  hasLineItemMathErrors,

  validateParsedReceiptLineItems,

  validateParsedReceiptMath,

} from "./parsedReceiptValidation";

import { stripMisclassifiedDiscountProducts } from "./stripMisclassifiedDiscountProducts";



const UNREADABLE_PRODUCT_NAME = /^(?:\*+\s*)?\d+(?:[.,]\d+)?\s*$|^\*+$/;



function sanitizeUnreadableProductName(item: ReceiptItem): ReceiptItem {

  const name = item.name.trim();

  if (!name || UNREADABLE_PRODUCT_NAME.test(name)) {

    return { ...item, name: "Okunamayan kalem" };

  }

  return item;

}



/**

 * Unified vision-first normalization pipeline.

 * Image → Vision API → normalizeVisionReceipt → UI

 *

 * Deterministic post-processors only — no legacy L2–L6 regex classifiers.

 */

export function normalizeVisionReceipt(parsed: ParsedReceipt): ParsedReceipt {

  const enriched: ParsedReceipt = {

    ...parsed,

    confidence: parsed.confidence ?? 0.9,

    rawText: parsed.rawText ?? "",

    discounts: parsed.discounts ?? [],

    payments: parsed.payments ?? [],

    products: parsed.products.map((item) => ({ ...item })),

  };



  const merged = mergeStandaloneMultiplierProducts(enriched);

  const migrosRecovered = recoverSplitMigrosProducts(merged);

  const migrosBagDeduped = dedupeMigrosPlasticBag(migrosRecovered);

  const vatApplied = applyProductLineVatRates(migrosBagDeduped);

  const upperBound = bindUpperLineQuantities(vatApplied);

  const posBound = bindPosLineQuantities(upperBound);

  const stripped = stripMisclassifiedDiscountProducts(posBound);

  const footerFixed = disambiguatePosFooter(stripped);

  const normalizedNames = normalizeVisionProductNames(footerFixed.products).map(

    sanitizeHallucinatedQuantities

  );

  const sanitized = {

    ...footerFixed,

    products: normalizedNames.map(sanitizeUnreadableProductName),

    discounts: footerFixed.discounts ?? [],

  };

  const rebound = bindUpperLineQuantities(sanitized);

  const migrosMetadata =
    isMigrosReceipt(rebound) && rebound.rawText?.trim()
      ? {
          ...rebound,
          products: rebound.products.map((item) => {
            const explicit = findExplicitQuantityForProduct(
              rebound.rawText!,
              item.name
            );
            if (explicit != null) return attachMigrosMultiplierMetadata(item);
            return item;
          }),
        }
      : rebound;

  const finalParsed = {

    ...migrosMetadata,

    discounts: sanitized.discounts,

  };



  const lineChecks = validateParsedReceiptLineItems(finalParsed);

  const math = validateParsedReceiptMath(finalParsed);

  const ocrConfidence = parsed.confidence ?? 0.9;
  const lineErrors = hasLineItemMathErrors(lineChecks);
  const mathOk = math.ok && !lineErrors;

  return {
    ...finalParsed,
    confidence: ocrConfidence,
    mathConsistent: mathOk,
  };

}


