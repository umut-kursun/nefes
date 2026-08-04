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
