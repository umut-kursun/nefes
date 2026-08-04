import { isWithinInterval, parseISO } from "date-fns";
import {
  formatSamePeriodMonthInsight,
  getSamePeriodMonthBounds,
  isMonthTrendReady,
} from "@/lib/analytics/month-comparison";
import { spendingExpenses } from "@/lib/analytics";
import { formatMoney, toPercent } from "@/lib/utils";
import type { Insight, InsightContext } from "./types";

function sumInRange(
  expenses: InsightContext["expenses"],
  start: Date,
  end: Date
): number {
  return spendingExpenses(expenses)
    .filter((e) => {
      try {
        return isWithinInterval(parseISO(e.date), { start, end });
      } catch {
        return false;
      }
    })
    .reduce((acc, e) => acc + (e.totalAmount || 0), 0);
}

/** Same calendar days this month vs last month (e.g. Aug 1–3 vs Jul 1–3). */
export function getSamePeriodMonthInsight(ctx: InsightContext): Insight | null {
  if (!isMonthTrendReady(ctx.now)) return null;

  const bounds = getSamePeriodMonthBounds(ctx.now);
  const current = sumInRange(
    ctx.expenses,
    bounds.currentStart,
    bounds.currentEnd
  );
  const previous = sumInRange(
    ctx.expenses,
    bounds.previousStart,
    bounds.previousEnd
  );

  if (current <= 0 && previous <= 0) return null;

  const trend =
    previous > 0
      ? toPercent(current, previous)
      : current > 0
        ? 100
        : null;

  if (trend == null || Math.abs(trend) < 8) return null;

  const up = trend > 0;

  return {
    id: "same-period-month",
    icon: "wallet",
    title: up ? "Bu dönem harcaman arttı" : "Bu dönem harcaman azaldı",
    description: `${formatSamePeriodMonthInsight(trend, bounds.dayCount)} Toplam: ${formatMoney(current)}.`,
    priority: 90,
    href: "/reports",
  };
}

/** Exported for tests — raw same-period totals. */
export function getSamePeriodMonthTotals(ctx: InsightContext) {
  const bounds = getSamePeriodMonthBounds(ctx.now);
  const current = sumInRange(
    ctx.expenses,
    bounds.currentStart,
    bounds.currentEnd
  );
  const previous = sumInRange(
    ctx.expenses,
    bounds.previousStart,
    bounds.previousEnd
  );
  return {
    ...bounds,
    current,
    previous,
    trend: bounds.trendReady ? toPercent(current, previous) : null,
  };
}
