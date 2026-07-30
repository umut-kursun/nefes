import { endOfMonth, isWithinInterval, parseISO, startOfMonth, subMonths } from "date-fns";
import { formatMoney } from "@/lib/utils";
import { isFuelCategory } from "@/lib/categories";
import { categoryHref, type Insight, type InsightContext } from "./types";

function sumFuel(expenses: InsightContext["expenses"]): number {
  return expenses.reduce((acc, e) => acc + (e.totalAmount || 0), 0);
}

/** Month-over-month fuel spend change with ₺ context. */
export function getFuelMonthTrend(ctx: InsightContext): Insight | null {
  const fuelCat = ctx.categories.find((c) => isFuelCategory(c));
  const fuelId = fuelCat?.id ?? "akaryakit";
  const fuelExpenses = ctx.expenses.filter(
    (e) => e.category === fuelId || !!e.fuel?.pricePerLiter
  );
  if (fuelExpenses.length < 2) return null;

  const monthStart = startOfMonth(ctx.now);
  const monthEnd = endOfMonth(ctx.now);
  const prevStart = startOfMonth(subMonths(ctx.now, 1));
  const prevEnd = endOfMonth(subMonths(ctx.now, 1));

  const inMonth = fuelExpenses.filter((e) => {
    try {
      return isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd });
    } catch {
      return false;
    }
  });
  const prevMonth = fuelExpenses.filter((e) => {
    try {
      return isWithinInterval(parseISO(e.date), { start: prevStart, end: prevEnd });
    } catch {
      return false;
    }
  });

  const current = sumFuel(inMonth);
  const previous = sumFuel(prevMonth);
  if (current <= 0 && previous <= 0) return null;

  let pct: number | null = null;
  if (previous > 0) {
    pct = Math.round(((current - previous) / previous) * 100);
  } else if (current > 0) {
    pct = 100;
  }
  if (pct == null || Math.abs(pct) < 8) return null;

  const up = pct > 0;
  const abs = Math.abs(pct);

  return {
    id: "fuel-month-trend",
    icon: "fuel",
    title: up ? "Akaryakıt harcaması arttı" : "Akaryakıt harcaması azaldı",
    description: up
      ? `Bu ay akaryakıt harcaman ${formatMoney(current)} — geçen aya göre %${abs} arttı.`
      : `Bu ay akaryakıt harcaman ${formatMoney(current)} — geçen aya göre %${abs} azaldı.`,
    priority: 88,
    href: categoryHref(fuelId),
  };
}
