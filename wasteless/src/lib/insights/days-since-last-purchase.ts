import { expenseHref, type Insight, type InsightContext } from "./types";
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

/** How many days since the latest purchase. */
export function getDaysSinceLastPurchase(
  ctx: InsightContext
): Insight | null {
  if (ctx.expenses.length === 0) return null;

  const latest = [...ctx.expenses].sort((a, b) =>
    b.date.localeCompare(a.date)
  )[0]!;

  let last: Date;
  try {
    last = startOfDay(parseISO(latest.date));
  } catch {
    return null;
  }
  if (Number.isNaN(last.getTime())) return null;

  const days = differenceInCalendarDays(startOfDay(ctx.now), last);
  if (days < 0) return null;

  const description =
    days === 0
      ? "Bugün bir satın alma kaydettin."
      : days === 1
        ? "Son satın almanın üzerinden 1 gün geçti."
        : `Son satın almanın üzerinden ${days} gün geçti.`;

  return {
    id: "days-since-last-purchase",
    icon: "bag",
    title: "Son satın alma",
    description,
    priority: days === 0 ? 35 : 40,
    href: expenseHref(latest.id),
  };
}
