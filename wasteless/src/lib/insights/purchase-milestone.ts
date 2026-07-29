import type { Insight, InsightContext } from "./types";

/** Celebrate purchase history milestones. */
export function getPurchaseMilestone(ctx: InsightContext): Insight | null {
  const n = ctx.expenses.length;
  const marks = [10, 25, 50, 100, 250, 500];
  // Show when within a small window after crossing, or exact match
  const hit = marks.find((m) => n === m || (n > m && n <= m + 2));
  if (!hit) return null;

  return {
    id: `purchase-milestone-${hit}`,
    icon: "sparkles",
    title: "Kilometre taşı",
    description:
      n === hit
        ? `${hit} satın alma kaydettin. Hafızan büyüyor.`
        : `${hit}+ satın alma kaydın var. Alışverişlerini hatırlamaya devam.`,
    priority: 82,
    href: "/history",
  };
}
