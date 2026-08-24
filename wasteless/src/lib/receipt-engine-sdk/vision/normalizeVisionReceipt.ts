import type { ParsedReceipt, ReceiptItem } from "../types/ParsedReceipt";

import { applyProductLineVatRates } from "./applyProductLineVatRate";

import { bindPosLineQuantities } from "./bindPosLineQuantities";

import { bindUpperLineQuantities } from "./bindUpperLineQuantities";

import { disambiguatePosFooter } from "./disambiguatePosFooter";

import { mergeStandaloneMultiplierProducts } from "./mergeStandaloneMultiplierProducts";

import {
  attachMigrosMultiplierMetadata,
  applyExplicitMigrosQuantities,
  dedupeMigrosPlasticBag,
  isMigrosReceipt,
  recoverSplitMigrosProducts,
  resolveMigrosProductQuantity,
} from "./migrosReceiptRules";

import { normalizeVisionProductNames } from "./normalizeVisionProductNames";

import { sanitizeHallucinatedQuantities } from "./parsedReceiptReconcile";

import {

  hasLineItemMathErrors,

  validateParsedReceiptLineItems,

  validateParsedReceiptMath,

} from "./parsedReceiptValidation";

import { stripMisclassifiedDiscountProducts } from "./stripMisclassifiedDiscountProducts";

import { extractReceiptNumberFromRawText } from "./extractReceiptNumberFromRawText";



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

    metadata: {
      ...parsed.metadata,
      receiptNumber:
        parsed.metadata.receiptNumber?.trim() ||
        (parsed.rawText?.trim()
          ? extractReceiptNumberFromRawText(parsed.rawText)
          : null),
    },

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

  const explicitMigros = applyExplicitMigrosQuantities(rebound);

  const migrosMetadata =
    isMigrosReceipt(explicitMigros) && explicitMigros.rawText?.trim()
      ? {
          ...explicitMigros,
          products: explicitMigros.products.map((item) => {
            const resolved = resolveMigrosProductQuantity(
              explicitMigros.rawText!,
              item.name,
              item.lineTotal
            );
            if (resolved?.source === "multiplier") {
              return attachMigrosMultiplierMetadata(item);
            }
            return item;
          }),
        }
      : explicitMigros;

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


