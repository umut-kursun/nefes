import type {
  DiscountInfo,
  ParsedReceipt,
  ReceiptItem,
} from "../types/ParsedReceipt";
import {
  hasEquivalentDiscount,
  normalizeDiscountAmount,
} from "./discountDedup";

const DISCOUNT_NAME_PATTERN = /İNDİRİM|INDIRIM|iskonto|kupon|promosyon/i;

function isMisclassifiedDiscount(item: ReceiptItem): boolean {
  const name = item.name;
  if (DISCOUNT_NAME_PATTERN.test(name)) return true;
  if (item.lineTotal < 0) return true;
  if (/%/.test(name) && /İNDİRİM|INDIRIM/i.test(name)) return true;
  return false;
}

function productToDiscount(item: ReceiptItem): DiscountInfo {
  const amount =
    item.lineTotal < 0 ? item.lineTotal : normalizeDiscountAmount(item.lineTotal);
  return {
    name: item.name,
    amount,
    ...(item.vatRatePercentage != null
      ? { vatRatePercentage: item.vatRatePercentage }
      : {}),
    linkedProductName: null,
  };
}

/** Move discount-like product rows into discounts[] (vision LLM safety net). */
export function stripMisclassifiedDiscountProducts(
  parsed: ParsedReceipt
): ParsedReceipt {
  const products: ReceiptItem[] = [];
  const discounts: DiscountInfo[] = [...(parsed.discounts ?? [])].map((d) => ({
    ...d,
    amount: normalizeDiscountAmount(d.amount),
  }));

  for (const item of parsed.products) {
    if (isMisclassifiedDiscount(item)) {
      const candidate = productToDiscount(item);
      if (!hasEquivalentDiscount(discounts, candidate)) {
        discounts.push(candidate);
      }
    } else {
      products.push(item);
    }
  }

  return {
    ...parsed,
    products,
    discounts,
  };
}
