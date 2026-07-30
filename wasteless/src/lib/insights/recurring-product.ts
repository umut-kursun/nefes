import { differenceInCalendarDays, parseISO } from "date-fns";
import { getProductPurchases } from "./helpers";
import { memorySearchHref, type Insight, type InsightContext } from "./types";

/**
 * Proactive habit insight: "Sütü genelde X günde bir alıyorsun"
 * (pattern detected, not overdue reminder — see purchase-frequency).
 */
export function getRecurringProduct(ctx: InsightContext): Insight | null {
  const rows = getProductPurchases(ctx);
  const byKey = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byKey.get(row.key) ?? [];
    list.push(row);
    byKey.set(row.key, list);
  }

  type Candidate = { name: string; avgDays: number; count: number };
  let best: Candidate | null = null;

  for (const list of Array.from(byKey.values())) {
    if (list.length < 4) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      try {
        const d = differenceInCalendarDays(
          parseISO(sorted[i]!.date),
          parseISO(sorted[i - 1]!.date)
        );
        if (d > 0 && d < 90) gaps.push(d);
      } catch {
        /* skip */
      }
    }
    if (gaps.length < 3) continue;
    const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    if (avg < 2 || avg > 45) continue;

    const variance =
      gaps.reduce((acc, g) => acc + Math.abs(g - avg), 0) / gaps.length;
    if (variance > avg * 0.6) continue;

    const name = sorted[sorted.length - 1]!.name;
    const score = list.length * (1 / (variance + 1));
    if (!best || score > best.count * (1 / (variance + 1))) {
      best = { name, avgDays: avg, count: list.length };
    }
  }

  if (!best) return null;

  const displayName =
    best.name.charAt(0).toLocaleUpperCase("tr-TR") + best.name.slice(1);

  return {
    id: `recurring-product-${best.name}`,
    icon: "bag",
    title: "Tekrarlayan alışveriş",
    description: `${displayName} genelde ${best.avgDays} günde bir alıyorsun (${best.count} kayıt).`,
    priority: 76,
    href: memorySearchHref(best.name),
  };
}
