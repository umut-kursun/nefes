import { isWithinInterval, parseISO } from "date-fns";
import { formatMoney } from "@/lib/utils";
import {
  formatSamePeriodMonthInsight,
  getSamePeriodMonthBounds,
  isMonthTrendReady,
} from "@/lib/analytics/month-comparison";
import { spendingExpenses } from "@/lib/analytics";
import { categoryHref, type Insight, type InsightContext } from "./types";

function sumInRange(
  expenses: InsightContext["expenses"],
  categoryId: string,
  start: Date,
  end: Date
): number {
  return spendingExpenses(expenses)
    .filter((e) => e.category === categoryId)
    .filter((e) => {
      try {
        return isWithinInterval(parseISO(e.date), { start, end });
      } catch {
        return false;
      }
    })
    .reduce((acc, e) => acc + (e.totalAmount || 0), 0);
}

/** Sigara category spend with same-period month trend. */
export function getCigaretteSpending(ctx: InsightContext): Insight | null {
  const sigaraId = "sigara";
  const entries = ctx.expenses.filter((e) => e.category === sigaraId);
  if (entries.length < 2) return null;

  const bounds = getSamePeriodMonthBounds(ctx.now);
  const current = sumInRange(
    ctx.expenses,
    sigaraId,
    bounds.currentStart,
    bounds.currentEnd
  );
  if (current <= 0) return null;

  let trendText = "";
  if (isMonthTrendReady(ctx.now)) {
    const previous = sumInRange(
      ctx.expenses,
      sigaraId,
      bounds.previousStart,
      bounds.previousEnd
    );
    if (previous > 0) {
      const pct = Math.round(((current - previous) / previous) * 100);
      if (Math.abs(pct) >= 5) {
        trendText = ` ${formatSamePeriodMonthInsight(pct, bounds.dayCount)}`;
      }
    }
  }

  return {
    id: "cigarette-spending",
    icon: "cigarette",
    title: "Sigara harcaması",
    description: `Bu ay sigaraya ${formatMoney(current)} harcadın.${trendText}`,
    priority: 82,
    href: categoryHref(sigaraId),
  };
}
