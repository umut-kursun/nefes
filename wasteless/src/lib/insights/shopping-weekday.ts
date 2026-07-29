import { parseISO } from "date-fns";
import type { Insight, InsightContext } from "./types";
import { weekdayNameTr } from "./helpers";

/**
 * Most common shopping weekday — links to full history for exploration.
 * Lower priority; kept only when the pattern is strong.
 */
export function getShoppingWeekday(ctx: InsightContext): Insight | null {
  if (ctx.expenses.length < 5) return null;

  const counts = new Array(7).fill(0) as number[];
  for (const e of ctx.expenses) {
    try {
      const d = parseISO(e.date);
      if (!Number.isNaN(d.getTime())) counts[d.getDay()]! += 1;
    } catch {
      /* ignore bad dates */
    }
  }

  let bestDay = 0;
  let bestCount = 0;
  for (let i = 0; i < 7; i++) {
    if (counts[i]! > bestCount) {
      bestCount = counts[i]!;
      bestDay = i;
    }
  }

  if (bestCount < 3) return null;
  const share = bestCount / ctx.expenses.length;
  if (share < 0.3) return null;

  return {
    id: "shopping-weekday",
    icon: "ticket",
    title: "Alışveriş rutinin",
    description: `Genellikle ${weekdayNameTr(bestDay)} günleri alışveriş yapıyorsun.`,
    priority: 45,
    href: "/history",
  };
}
