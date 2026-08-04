import type { Expense, UserCategory, UserTag } from "@/lib/types";
import { getAverageFuelPrice } from "./average-fuel-price";
import { getAverageReceipt } from "./average-receipt";
import { getCheapestMerchantInsight } from "./cheapest-merchant";
import { getCoffeeFrequency } from "./coffee-frequency";
import { getCigaretteSpending } from "./cigarette-spending";
import { getDaysSinceLastPurchase } from "./days-since-last-purchase";
import { getSamePeriodMonthInsight } from "./same-period-month";
import { getFuelMonthTrend } from "./fuel-month-trend";
import { getHighestSpendingCategory } from "./highest-spending-category";
import { getHighestSpendingProduct } from "./highest-spending-product";
import { getLargestPurchase } from "./largest-purchase";
import { getMonthlyComparison } from "./monthly-comparison";
import { getMostPurchasedProduct } from "./most-purchased-product";
import { getMostUsedTag } from "./most-used-tag";
import { getMostVisitedMerchant } from "./most-visited-merchant";
import { getPriceDecrease } from "./price-decreased";
import { getPriceIncrease } from "./price-increased";
import { getPurchaseFrequency } from "./purchase-frequency";
import { getPurchaseMilestone } from "./purchase-milestone";
import { getRecurringProduct } from "./recurring-product";
import { getSavingsOpportunity } from "./savings-opportunity";
import { getShoppingWeekday } from "./shopping-weekday";
import { pickHomeInsights } from "./pick-home";
import type { Insight, InsightContext } from "./types";

const GENERATORS: Array<(ctx: InsightContext) => Insight | null> = [
  getSamePeriodMonthInsight,
  getFuelMonthTrend,
  getCigaretteSpending,
  getSavingsOpportunity,
  getPriceIncrease,
  getPriceDecrease,
  getCheapestMerchantInsight,
  getMonthlyComparison,
  getPurchaseMilestone,
  getPurchaseFrequency,
  getRecurringProduct,
  getCoffeeFrequency,
  getHighestSpendingProduct,
  getHighestSpendingCategory,
  getAverageFuelPrice,
  getMostPurchasedProduct,
  getMostVisitedMerchant,
  getLargestPurchase,
  getAverageReceipt,
  getMostUsedTag,
  getShoppingWeekday,
  getDaysSinceLastPurchase,
];

const MAX_INSIGHTS = 12;

export type GenerateInsightsInput = {
  expenses: Expense[];
  categories: UserCategory[];
  tags?: UserTag[];
  now?: Date;
};

/**
 * Local-only Smart Insights engine.
 * Runs each generator, drops nulls, sorts by priority, caps at MAX.
 */
export function generateInsights(input: GenerateInsightsInput): Insight[] {
  const ctx: InsightContext = {
    expenses: input.expenses,
    categories: input.categories,
    tags: input.tags ?? [],
    now: input.now ?? new Date(),
  };

  const insights: Insight[] = [];
  for (const run of GENERATORS) {
    const result = run(ctx);
    if (result) insights.push(result);
  }

  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_INSIGHTS);
}

/** Highest-priority insight for quick surfaces. */
export function getTopInsight(
  input: GenerateInsightsInput
): Insight | null {
  return generateInsights(input)[0] ?? null;
}

/** Diverse rotating pool for the Home Assistant. */
export function getHomeAssistantInsights(
  input: GenerateInsightsInput,
  limit = 6
): Insight[] {
  return pickHomeInsights(generateInsights(input), limit);
}
