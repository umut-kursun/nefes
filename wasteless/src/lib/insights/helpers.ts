import { normalizeMerchantName, normalizeKey } from "@/lib/merchants";
import { computeUnitPrice, normalizeProductName } from "@/lib/products";
import { displayProductName } from "@/lib/product-name-cleaner";
import type { Expense } from "@/lib/types";
import type { InsightContext } from "./types";

export type ProductPurchase = {
  key: string;
  name: string;
  expenseId: string;
  date: string;
  merchant: string;
  price: number;
  unitPrice: number | null;
};

/** Flatten receipt line-items into comparable product purchases (newest first). */
export function flattenProductPurchases(expenses: Expense[]): ProductPurchase[] {
  const rows: ProductPurchase[] = [];

  for (const expense of expenses) {
    const merchant =
      normalizeMerchantName(expense.merchantName) ||
      expense.merchantName ||
      "Bilinmeyen";

    for (const item of expense.items ?? []) {
      const cleaned = displayProductName(
        item.normalizedName || item.name
      );
      const name = normalizeProductName(cleaned) || cleaned || item.name;
      if (!name?.trim()) continue;
      const price = item.totalPrice ?? 0;
      if (price <= 0) continue;

      const unit = computeUnitPrice({
        totalPrice: price,
        quantity: item.quantity,
        unit: item.unit,
        name: cleaned || item.name,
        existingUnitPrice: item.unitPrice,
      });

      rows.push({
        key: normalizeKey(name),
        name,
        expenseId: expense.id,
        date: expense.date,
        merchant,
        price,
        unitPrice: unit.unitPrice,
      });
    }
  }

  rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows;
}

/** Memoized on the context so generators share one pass over items. */
export function getProductPurchases(ctx: InsightContext): ProductPurchase[] {
  if (!ctx.productPurchases) {
    ctx.productPurchases = flattenProductPurchases(ctx.expenses);
  }
  return ctx.productPurchases;
}

export function comparePrice(
  newer: number,
  older: number
): number | null {
  if (older <= 0) return null;
  return ((newer - older) / older) * 100;
}

export function weekdayNameTr(day: number): string {
  const names = [
    "Pazar",
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
  ];
  return names[day] ?? "bilinmeyen gün";
}
