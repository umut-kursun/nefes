import type { DiscountInfo } from "../types/ParsedReceipt";

const DISCOUNT_AMOUNT_TOLERANCE = 0.02;

export function normalizeDiscountAmount(amount: number): number {
  if (amount === 0) return 0;
  return amount < 0 ? amount : -Math.abs(amount);
}

export function discountsEquivalent(a: DiscountInfo, b: DiscountInfo): boolean {
  const amountA = Math.abs(a.amount);
  const amountB = Math.abs(b.amount);
  if (Math.abs(amountA - amountB) > DISCOUNT_AMOUNT_TOLERANCE) return false;

  if (a.linkedProductName && b.linkedProductName) {
    return a.linkedProductName === b.linkedProductName;
  }

  const nameA = a.name.trim().toLocaleLowerCase("tr-TR");
  const nameB = b.name.trim().toLocaleLowerCase("tr-TR");
  if (nameA === nameB) return true;

  if (a.linkedProductName && b.name.includes(a.linkedProductName)) return true;
  if (b.linkedProductName && a.name.includes(b.linkedProductName)) return true;

  return false;
}

export function hasEquivalentDiscount(
  discounts: readonly DiscountInfo[],
  candidate: DiscountInfo
): boolean {
  return discounts.some((d) => discountsEquivalent(d, candidate));
}
