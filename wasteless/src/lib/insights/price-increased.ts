import { memorySearchHref, type Insight, type InsightContext } from "./types";
import { comparePrice, getProductPurchases } from "./helpers";

/** Product whose latest purchase is meaningfully more expensive than the previous. */
export function getPriceIncrease(ctx: InsightContext): Insight | null {
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
    if (pct == null || pct < 5) continue;
    if (!best || pct > best.pct) {
      best = { name: list[0]!.name, pct };
    }
  }

  if (!best) return null;

  return {
    id: "price-increased",
    icon: "sparkles",
    title: "Birim fiyat arttı",
    description: `${best.name} birim fiyatı önceki alımına göre %${Math.round(best.pct)} arttı.`,
    priority: 95,
    href: memorySearchHref(best.name),
  };
}
