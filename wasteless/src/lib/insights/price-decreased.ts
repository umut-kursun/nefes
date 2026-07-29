import { memorySearchHref, type Insight, type InsightContext } from "./types";
import { comparePrice, getProductPurchases } from "./helpers";

/** Product whose latest purchase is meaningfully cheaper than the previous. */
export function getPriceDecrease(ctx: InsightContext): Insight | null {
  const purchases = getProductPurchases(ctx);
  const byKey = new Map<string, typeof purchases>();

  for (const p of purchases) {
    const list = byKey.get(p.key) ?? [];
    list.push(p);
    byKey.set(p.key, list);
  }

  let best: { name: string; pct: number } | null = null;

  for (const list of Array.from(byKey.values())) {
    if (list.length < 2) continue;
    const newer = list[0]!.unitPrice ?? list[0]!.price;
    const older = list[1]!.unitPrice ?? list[1]!.price;
    const pct = comparePrice(newer, older);
    if (pct == null || pct > -5) continue;
    const drop = Math.abs(pct);
    if (!best || drop > best.pct) {
      best = { name: list[0]!.name, pct: drop };
    }
  }

  if (!best) return null;

  return {
    id: "price-decreased",
    icon: "sparkles",
    title: "Birim fiyat düştü",
    description: `${best.name} önceki alımına göre %${Math.round(best.pct)} daha uygun.`,
    priority: 90,
    href: memorySearchHref(best.name),
  };
}
