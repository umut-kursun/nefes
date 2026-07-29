import { getParentCategoryBreakdownWithTrend } from "@/lib/analytics";
import { getCategoryMeta } from "@/lib/categories";
import { categoryHref, type Insight, type InsightContext } from "./types";

/** Month-over-month parent category spend change (largest absolute move). */
export function getMonthlyComparison(ctx: InsightContext): Insight | null {
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

  return {
    id: "monthly-comparison",
    icon: meta.icon || "wallet",
    title: up ? "Kategori harcaması arttı" : "Kategori harcaması azaldı",
    description: up
      ? `${meta.label} harcaman geçen aya göre %${pct} arttı.`
      : `${meta.label} harcaman geçen aya göre %${pct} azaldı.`,
    priority: 85,
    href: categoryHref(top.category),
  };
}
