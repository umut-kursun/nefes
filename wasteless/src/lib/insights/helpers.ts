import type { Expense } from "@/lib/types";
import {
  buildPurchaseIndex,
  indexToInsightPurchases,
  type InsightProductPurchase,
} from "@/lib/analytics/purchase-index";
import type { InsightContext } from "./types";

export type ProductPurchase = InsightProductPurchase;

/** Flatten receipt line-items into comparable product purchases (newest first). */
export function flattenProductPurchases(expenses: Expense[]): ProductPurchase[] {
  return indexToInsightPurchases(buildPurchaseIndex(expenses));
}

/** Memoized on the context so generators share one pass over items. */
export function getProductPurchases(ctx: InsightContext): ProductPurchase[] {
  if (!ctx.productPurchases) {
    ctx.productPurchases = flattenProductPurchases(ctx.expenses);
  }
  return ctx.productPurchases;
}

const MAX_PRICE_INSIGHT_PCT = 500;

export function resolveComparablePrices(
  newer: ProductPurchase,
  older: ProductPurchase
): { newer: number; older: number } | null {
  if (newer.unitPrice != null && older.unitPrice != null) {
    return { newer: newer.unitPrice, older: older.unitPrice };
  }
  if (
    newer.baseUnit &&
    older.baseUnit &&
    newer.baseUnit === older.baseUnit
  ) {
    return { newer: newer.price, older: older.price };
  }
  return null;
}

export function comparePrice(
  newer: number,
  older: number
): number | null {
  if (older <= 0) return null;
  const pct = ((newer - older) / older) * 100;
  if (Math.abs(pct) > MAX_PRICE_INSIGHT_PCT) return null;
  return pct;
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
