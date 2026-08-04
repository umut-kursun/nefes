import { isWithinInterval, parseISO } from "date-fns";
import { formatMoney } from "@/lib/utils";
import {
  formatSamePeriodMonthInsight,
  getSamePeriodMonthBounds,
  isMonthTrendReady,
} from "@/lib/analytics/month-comparison";
import { spendingExpenses } from "@/lib/analytics";
import { toPercent } from "@/lib/utils";
import { isFuelCategory } from "@/lib/categories";
import { categoryHref, type Insight, type InsightContext } from "./types";

function sumFuelInRange(
  expenses: InsightContext["expenses"],
  fuelId: string,
  start: Date,
  end: Date
): number {
  return spendingExpenses(expenses)
    .filter((e) => e.category === fuelId)
    .filter((e) => {
      try {
        return isWithinInterval(parseISO(e.date), { start, end });
      } catch {
        return false;
      }
    })
    .reduce((acc, e) => acc + (e.totalAmount || 0), 0);
}

/** Month-over-month fuel spend — same calendar days only; suppressed days 1–5. */
export function getFuelMonthTrend(ctx: InsightContext): Insight | null {
  if (!isMonthTrendReady(ctx.now)) return null;

  const fuelCat = ctx.categories.find((c) => isFuelCategory(c));
  const fuelId = fuelCat?.id ?? "akaryakit";
  const fuelExpenses = ctx.expenses.filter((e) => e.category === fuelId);
  if (fuelExpenses.length < 2) return null;

  const bounds = getSamePeriodMonthBounds(ctx.now);
  const current = sumFuelInRange(
    ctx.expenses,
    fuelId,
    bounds.currentStart,
    bounds.currentEnd
  );
  const previous = sumFuelInRange(
    ctx.expenses,
    fuelId,
    bounds.previousStart,
    bounds.previousEnd
  );

  if (current <= 0 && previous <= 0) return null;

  let pct: number | null = null;
  if (previous > 0) {
    pct = Math.round(((current - previous) / previous) * 100);
  } else if (current > 0) {
    pct = 100;
  }
  if (pct == null || Math.abs(pct) < 8) return null;

  const trend = toPercent(current, previous) ?? pct;
  const up = trend > 0;

  return {
    id: "fuel-month-trend",
    icon: "fuel",
    title: up ? "Akaryakıt harcaması arttı" : "Akaryakıt harcaması azaldı",
    description: `${formatSamePeriodMonthInsight(trend, bounds.dayCount)} Akaryakıt toplamı: ${formatMoney(current)}.`,
    priority: 88,
    href: categoryHref(fuelId),
  };
}
