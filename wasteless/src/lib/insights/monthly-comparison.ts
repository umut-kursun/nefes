import { getParentCategoryBreakdownWithTrend } from "@/lib/analytics";
import { getSamePeriodMonthBounds, isMonthTrendReady } from "@/lib/analytics/month-comparison";
import { getCategoryMeta } from "@/lib/categories";
import { categoryHref, type Insight, type InsightContext } from "./types";

/** Same-period parent category spend change (largest absolute move). */
export function getMonthlyComparison(ctx: InsightContext): Insight | null {
  if (!isMonthTrendReady(ctx.now)) return null;

  const trends = getParentCategoryBreakdownWithTrend(
    ctx.expenses,
    ctx.categories,
    "month",
    ctx.now
  );

  const movers = trends.filter(
    (t) => t.trend != null && Math.abs(t.trend) >= 10 && t.total > 0
  );
  if (movers.length === 0) return null;

  const top = [...movers].sort(
    (a, b) => Math.abs(b.trend!) - Math.abs(a.trend!)
  )[0]!;
  const meta = getCategoryMeta(top.category, ctx.categories);
  const pct = Math.round(Math.abs(top.trend!));
  const up = top.trend! > 0;
  const bounds = getSamePeriodMonthBounds(ctx.now);

  return {
    id: "monthly-comparison",
    icon: meta.icon || "wallet",
    title: up ? "Kategori harcaması arttı" : "Kategori harcaması azaldı",
    description: up
      ? `${meta.label} harcaman ayın ilk ${bounds.dayCount} gününde geçen ayın aynı dönemine göre %${pct} arttı.`
      : `${meta.label} harcaman ayın ilk ${bounds.dayCount} gününde geçen ayın aynı dönemine göre %${pct} azaldı.`,
    priority: 85,
    href: categoryHref(top.category),
  };
}
