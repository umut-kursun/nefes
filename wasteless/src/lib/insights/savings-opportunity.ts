import { getParentCategoryBreakdownWithTrend } from "@/lib/analytics";
import { getCategoryMeta } from "@/lib/categories";
import { formatMoney } from "@/lib/utils";
import { categoryHref, type Insight, type InsightContext } from "./types";

/** Discretionary parent categories where a small cut yields meaningful savings. */
const DISCRETIONARY = new Set([
  "yeme_icme",
  "eglence",
  "giyim",
  "sigara",
  "market",
  "saglik",
  "other",
]);

/** Rough monthly savings estimate from top rising discretionary category. */
export function getSavingsOpportunity(ctx: InsightContext): Insight | null {
  const trends = getParentCategoryBreakdownWithTrend(
    ctx.expenses,
    ctx.categories,
    "month",
    ctx.now
  );

  const rising = trends
    .filter(
      (t) =>
        DISCRETIONARY.has(t.category) &&
        t.trend != null &&
        t.trend >= 12 &&
        t.total >= 200
    )
    .sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0));

  const top = rising[0];
  if (!top || top.trend == null) return null;

  const meta = getCategoryMeta(top.category, ctx.categories);
  const savingsEstimate = Math.round(top.total * 0.15);
  if (savingsEstimate < 50) return null;

  return {
    id: "savings-opportunity",
    icon: "savings",
    title: "Tasarruf fırsatı",
    description: `${meta.label} harcaman bu ay yükseldi. %15 kısarsan ayda yaklaşık ${formatMoney(savingsEstimate)} tasarruf edebilirsin.`,
    priority: 80,
    href: categoryHref(top.category),
  };
}
