export {
  generateInsights,
  getTopInsight,
  getHomeAssistantInsights,
} from "./generate";
export type { GenerateInsightsInput } from "./generate";
export type { Insight, InsightContext } from "./types";
export { pickHomeInsights } from "./pick-home";

export { getMostPurchasedProduct } from "./most-purchased-product";
export { getHighestSpendingProduct } from "./highest-spending-product";
export { getHighestSpendingCategory } from "./highest-spending-category";
export { getMostVisitedMerchant } from "./most-visited-merchant";
export { getPriceIncrease } from "./price-increased";
export { getPriceDecrease } from "./price-decreased";
export { getCheapestMerchantInsight } from "./cheapest-merchant";
export { getMonthlyComparison } from "./monthly-comparison";
export { getShoppingWeekday } from "./shopping-weekday";
export { getDaysSinceLastPurchase } from "./days-since-last-purchase";
export { getLargestPurchase } from "./largest-purchase";
export { getMostUsedTag } from "./most-used-tag";
export { getAverageReceipt } from "./average-receipt";
export { getAverageFuelPrice } from "./average-fuel-price";
export { getPurchaseMilestone } from "./purchase-milestone";
export { getPurchaseFrequency } from "./purchase-frequency";
export {
  memorySearchHref,
  categoryHref,
  expenseHref,
  tagHref,
} from "./types";
