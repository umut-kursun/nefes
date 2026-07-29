import { getCategoryMeta } from "@/lib/categories";
import { getPeriodOverview } from "@/lib/analytics";
import { categoryHref, type Insight, type InsightContext } from "./types";

/** Largest category spend this month. */
export function getHighestSpendingCategory(
  ctx: InsightContext
): Insight | null {
  const overview = getPeriodOverview(
    ctx.expenses,
    "month",
    ctx.now,
    ctx.categories
  );
  if (!overview.largestCategory || overview.total <= 0) return null;

  const id = overview.largestCategory.category;
  const meta = getCategoryMeta(id, ctx.categories);

  return {
    id: "highest-spending-category",
    icon: meta.icon || "shopping",
    title: "En yüksek harcama kategorisi",
    description: `Bu ay en çok ${meta.label} kategorisine harcadın.`,
    priority: 75,
    href: categoryHref(id),
  };
}
