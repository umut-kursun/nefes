import { memorySearchHref, type Insight, type InsightContext } from "./types";
import { getProductPurchases } from "./helpers";

/**
 * Same product bought at multiple merchants — usual store is not the cheapest.
 */
export function getCheapestMerchantInsight(
  ctx: InsightContext
): Insight | null {
  const purchases = getProductPurchases(ctx);
  const byKey = new Map<string, typeof purchases>();

  for (const p of purchases) {
    const list = byKey.get(p.key) ?? [];
    list.push(p);
    byKey.set(p.key, list);
  }

  let best: {
    name: string;
    usual: string;
    cheap: string;
    pct: number;
  } | null = null;

  for (const list of Array.from(byKey.values())) {
    const merchantMap = new Map<string, { count: number; sum: number }>();
    for (const p of list) {
      const price = p.unitPrice ?? p.price;
      const cur = merchantMap.get(p.merchant) ?? { count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += price;
      merchantMap.set(p.merchant, cur);
    }
    if (merchantMap.size < 2) continue;

    const stats = Array.from(merchantMap.entries()).map(([merchant, m]) => ({
      merchant,
      count: m.count,
      avg: m.sum / m.count,
    }));

    const usual = [...stats].sort((a, b) => b.count - a.count)[0]!;
    const cheap = [...stats].sort((a, b) => a.avg - b.avg)[0]!;
    if (usual.merchant === cheap.merchant) continue;
    if (usual.count < 2 || cheap.avg <= 0) continue;
    const pct = ((usual.avg - cheap.avg) / cheap.avg) * 100;
    if (pct < 5) continue;

    if (!best || pct > best.pct) {
      best = {
        name: list[0]!.name,
        usual: usual.merchant,
        cheap: cheap.merchant,
        pct,
      };
    }
  }

  if (!best) return null;

  return {
    id: "cheapest-merchant",
    icon: "savings",
    title: "Daha uygun işyeri",
    description: `${best.name} genelde ${best.usual}'da; ${best.cheap} yaklaşık %${Math.round(best.pct)} daha uygun.`,
    priority: 88,
    href: memorySearchHref(best.name),
  };
}
