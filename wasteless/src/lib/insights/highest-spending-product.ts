import { formatMoney } from "@/lib/utils";
import { memorySearchHref, type Insight, type InsightContext } from "./types";
import { getProductPurchases } from "./helpers";

/** Highest total spend on a single product. */
export function getHighestSpendingProduct(
  ctx: InsightContext
): Insight | null {
  const purchases = getProductPurchases(ctx);
  if (purchases.length === 0) return null;

  const totals = new Map<string, { name: string; total: number }>();
  for (const p of purchases) {
    const cur = totals.get(p.key) ?? { name: p.name, total: 0 };
    cur.total += p.price;
    totals.set(p.key, cur);
  }

  const top = Array.from(totals.values()).sort((a, b) => b.total - a.total)[0];
  if (!top || top.total <= 0) return null;

  return {
    id: "highest-spending-product",
    icon: "wallet",
    title: "En yüksek tutarlı ürün",
    description: `${top.name} için toplam ${formatMoney(top.total)} harcadın.`,
    priority: 80,
    href: memorySearchHref(top.name),
  };
}
