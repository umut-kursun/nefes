import { normalizeMerchantName } from "@/lib/merchants";
import { memorySearchHref, type Insight, type InsightContext } from "./types";

/** Merchant with the most visits. */
export function getMostVisitedMerchant(
  ctx: InsightContext
): Insight | null {
  const map = new Map<string, number>();
  for (const e of ctx.expenses) {
    const name =
      normalizeMerchantName(e.merchantName) || e.merchantName?.trim();
    if (!name) continue;
    map.set(name, (map.get(name) ?? 0) + 1);
  }

  const top = Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 2) return null;

  return {
    id: "most-visited-merchant",
    icon: "building",
    title: "En çok ziyaret edilen işyeri",
    description: `Bu dönemde en çok ${top[0]}'da alışveriş yapıyorsun (${top[1]} kez).`,
    priority: 65,
    href: memorySearchHref(top[0]),
  };
}
