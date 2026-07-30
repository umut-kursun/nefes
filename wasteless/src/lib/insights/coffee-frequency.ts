import { endOfMonth, isWithinInterval, parseISO, startOfMonth } from "date-fns";
import { getProductPurchases } from "./helpers";
import { memorySearchHref, type Insight, type InsightContext } from "./types";

const COFFEE_RE = /kahve|coffee|latte|espresso|cappuccino|americano|mocha/i;

function isCoffeePurchase(name: string): boolean {
  return COFFEE_RE.test(name);
}

/** Coffee purchase count this month from line items. */
export function getCoffeeFrequency(ctx: InsightContext): Insight | null {
  const monthStart = startOfMonth(ctx.now);
  const monthEnd = endOfMonth(ctx.now);

  const rows = getProductPurchases(ctx).filter((row) => {
    if (!isCoffeePurchase(row.name)) return false;
    try {
      return isWithinInterval(parseISO(row.date), { start: monthStart, end: monthEnd });
    } catch {
      return false;
    }
  });

  if (rows.length < 2) return null;

  const count = rows.length;
  const sample = rows[0]!.name;

  return {
    id: "coffee-frequency",
    icon: "coffee",
    emoji: "☕",
    title: "Kahve alışkanlığı",
    description:
      count === 1
        ? `Bu ay kahve aldın.`
        : `Bu ay kahve ${count} kez aldın${count >= 5 ? " — sık bir alışkanlık" : ""}.`,
    priority: 74,
    href: memorySearchHref(sample),
  };
}
