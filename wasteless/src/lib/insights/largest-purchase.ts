import { formatMoney } from "@/lib/utils";
import { expenseHref, type Insight, type InsightContext } from "./types";

/** Single largest expense by totalAmount. */
export function getLargestPurchase(ctx: InsightContext): Insight | null {
  if (ctx.expenses.length === 0) return null;

  const biggest = [...ctx.expenses].sort(
    (a, b) => (b.totalAmount || 0) - (a.totalAmount || 0)
  )[0]!;

  if (!biggest.totalAmount || biggest.totalAmount <= 0) return null;

  const where =
    biggest.merchantName?.trim() ||
    biggest.subcategory?.trim() ||
    null;

  return {
    id: "largest-purchase",
    icon: "card",
    title: "En büyük satın alma",
    description: where
      ? `En büyük harcaman ${formatMoney(biggest.totalAmount)} — ${where}.`
      : `En büyük harcaman ${formatMoney(biggest.totalAmount)}.`,
    priority: 60,
    href: expenseHref(biggest.id),
  };
}
