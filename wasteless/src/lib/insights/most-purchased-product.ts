import { memorySearchHref, type Insight, type InsightContext } from "./types";
import { getProductPurchases } from "./helpers";

/** Most purchased product by count. */
export function getMostPurchasedProduct(
  ctx: InsightContext
): Insight | null {
  const purchases = getProductPurchases(ctx);
  if (purchases.length === 0) return null;

  const counts = new Map<string, { name: string; count: number }>();
  for (const p of purchases) {
    const cur = counts.get(p.key) ?? { name: p.name, count: 0 };
    cur.count += 1;
    counts.set(p.key, cur);
  }

  const top = Array.from(counts.values()).sort((a, b) => b.count - a.count)[0];
  if (!top || top.count < 2) return null;

  return {
    id: "most-purchased-product",
    icon: "shopping",
    title: "En sık alınan ürün",
    description: `“${top.name}” ürününü ${top.count} kez aldın.`,
    priority: 70,
    href: memorySearchHref(top.name),
  };
}
