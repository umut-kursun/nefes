import { getTopMerchantByVisits } from "@/lib/analytics";
import { memorySearchHref, type Insight, type InsightContext } from "./types";

/** Merchant with the most visits. */
export function getMostVisitedMerchant(
  ctx: InsightContext
): Insight | null {
  const top = getTopMerchantByVisits(ctx.expenses);
  if (!top || top.count < 2) return null;

  return {
    id: "most-visited-merchant",
    icon: "building",
    title: "En çok ziyaret edilen işyeri",
    description: `Bu dönemde en çok ${top.name}'da alışveriş yapıyorsun (${top.count} kez).`,
    priority: 65,
    href: memorySearchHref(top.name),
  };
}
