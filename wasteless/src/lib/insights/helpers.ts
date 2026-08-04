import { normalizeMerchantName, normalizeKey } from "@/lib/merchants";
import { computeUnitPrice, normalizeProductName } from "@/lib/products";
import { displayProductName } from "@/lib/product-name-cleaner";
import { isValidFuelExpense, normalizeFuelTypeKey } from "@/lib/fuel-memory";
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
  baseUnit?: "L" | "kg" | "ad" | null;
};

function comparableUnitPrice(item: Expense["items"][number]): number | null {
  if (item.normalizedUnitPrice != null && Number.isFinite(item.normalizedUnitPrice)) {
    return item.normalizedUnitPrice;
  }
  const unit = computeUnitPrice({
    totalPrice: item.totalPrice,
    quantity: item.quantity,
    unit: item.unit,
    name: item.name,
    existingUnitPrice: item.unitPrice,
  });
  return unit.unitPrice;
}

function purchaseKey(item: Expense["items"][number], name: string): string {
  if (item.productKey?.trim()) return item.productKey;
  return normalizeKey(name);
}

/** Flatten receipt line-items into comparable product purchases (newest first). */
export function flattenProductPurchases(expenses: Expense[]): ProductPurchase[] {
  const rows: ProductPurchase[] = [];

  for (const expense of expenses) {
    const merchant =
      normalizeMerchantName(expense.merchantName) ||
      expense.merchantName ||
      "Bilinmeyen";

    if (isValidFuelExpense(expense)) {
      const fuelName = normalizeFuelTypeKey(
        expense.fuel!.fuelType ?? expense.subcategory
      );
      rows.push({
        key: `fuel:${normalizeKey(fuelName)}`,
        name: fuelName,
        expenseId: expense.id,
        date: expense.date,
        merchant,
        price: expense.totalAmount,
        unitPrice: expense.fuel!.pricePerLiter!,
        baseUnit: "L",
      });
    }

    for (const item of expense.items ?? []) {
      const cleaned = displayProductName(
        item.normalizedName || item.name
      );
      const name = normalizeProductName(cleaned) || cleaned || item.name;
      if (!name?.trim()) continue;
      const price = item.totalPrice ?? 0;
      if (price <= 0) continue;

      const unitPrice = comparableUnitPrice(item);

      rows.push({
        key: purchaseKey(item, name),
        name,
        expenseId: expense.id,
        date: expense.date,
        merchant,
        price,
        unitPrice,
        baseUnit: item.baseUnit ?? null,
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
