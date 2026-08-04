import { formatMoney } from "@/lib/utils";
import { getPeriodOverview } from "@/lib/analytics";
import type { Insight, InsightContext } from "./types";

/** Average receipt / purchase amount this month. */
export function getAverageReceipt(ctx: InsightContext): Insight | null {
  const overview = getPeriodOverview(
    ctx.expenses,
    "month",
    ctx.now,
    ctx.categories
  );
  if (overview.count < 3 || overview.total <= 0) return null;

  const avg = overview.total / overview.count;
  return {
    id: "average-receipt",
    icon: "receipt",
    title: "Ortalama fiş",
    description: `Bu ay ortalama fiş tutarın ${formatMoney(avg)} — ${overview.count} alışverişin ortalaması.`,
    priority: 58,
    href: "/history",
  };
}
