import { formatMoney } from "@/lib/utils";
import { getFuelStats } from "@/lib/analytics";
import { isFuelCategory } from "@/lib/categories";
import { isValidFuelExpense } from "@/lib/fuel-memory";
import { categoryHref, type Insight, type InsightContext } from "./types";

/** Average ₺/L across fuel purchases — links to Fuel detail. */
export function getAverageFuelPrice(ctx: InsightContext): Insight | null {
  const fuelCat = ctx.categories.find((c) => isFuelCategory(c));
  const fuelId = fuelCat?.id ?? "akaryakit";
  const fuelExpenses = ctx.expenses.filter((e) => isValidFuelExpense(e));
  const stats = getFuelStats(fuelExpenses);
  if (stats.fillUps < 2 || stats.averageLiterPrice == null) return null;

  return {
    id: "average-fuel-price",
    icon: "fuel",
    title: "Ortalama yakıt",
    description: `Ortalama litre fiyatın ${formatMoney(stats.averageLiterPrice)} (${stats.fillUps} dolum).`,
    priority: 72,
    href: categoryHref(fuelId),
  };
}
