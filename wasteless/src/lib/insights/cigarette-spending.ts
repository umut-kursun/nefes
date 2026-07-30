import { endOfMonth, isWithinInterval, parseISO, startOfMonth, subMonths } from "date-fns";
import { formatMoney } from "@/lib/utils";
import { categoryHref, type Insight, type InsightContext } from "./types";

function sumCigarette(expenses: InsightContext["expenses"]): number {
  return expenses.reduce((acc, e) => acc + (e.totalAmount || 0), 0);
}

/** Sigara category spend with month trend and ₺ amount. */
export function getCigaretteSpending(ctx: InsightContext): Insight | null {
  const sigaraId = "sigara";
  const entries = ctx.expenses.filter((e) => e.category === sigaraId);
  if (entries.length < 2) return null;

  const monthStart = startOfMonth(ctx.now);
  const monthEnd = endOfMonth(ctx.now);
  const prevStart = startOfMonth(subMonths(ctx.now, 1));
  const prevEnd = endOfMonth(subMonths(ctx.now, 1));

  const inMonth = entries.filter((e) => {
    try {
      return isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd });
    } catch {
      return false;
    }
  });
  const prevMonth = entries.filter((e) => {
    try {
      return isWithinInterval(parseISO(e.date), { start: prevStart, end: prevEnd });
    } catch {
      return false;
    }
  });

  const current = sumCigarette(inMonth);
  if (current <= 0) return null;

  const previous = sumCigarette(prevMonth);
  let trendText = "";
  if (previous > 0) {
    const pct = Math.round(((current - previous) / previous) * 100);
    if (Math.abs(pct) >= 5) {
      trendText =
        pct > 0
          ? ` Geçen aya göre %${Math.abs(pct)} arttı.`
          : ` Geçen aya göre %${Math.abs(pct)} azaldı.`;
    }
  }

  return {
    id: "cigarette-spending",
    icon: "cigarette",
    title: "Sigara harcaması",
    description: `Bu ay sigaraya ${formatMoney(current)} harcadın.${trendText}`,
    priority: 82,
    href: categoryHref(sigaraId),
  };
}
