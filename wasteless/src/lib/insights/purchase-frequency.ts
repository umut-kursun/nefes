import { differenceInCalendarDays, parseISO } from "date-fns";
import { getProductPurchases } from "./helpers";
import { memorySearchHref, type Insight, type InsightContext } from "./types";

/**
 * Habitual product reminder: usually every N days, and it's been a while.
 */
export function getPurchaseFrequency(ctx: InsightContext): Insight | null {
  const rows = getProductPurchases(ctx);
  const byKey = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byKey.get(row.key) ?? [];
    list.push(row);
    byKey.set(row.key, list);
  }

  type Candidate = {
    name: string;
    avgDays: number;
    since: number;
    href: string;
  };
  let best: Candidate | null = null;

  for (const list of Array.from(byKey.values())) {
    if (list.length < 3) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      try {
        const d = differenceInCalendarDays(
          parseISO(sorted[i]!.date),
          parseISO(sorted[i - 1]!.date)
        );
        if (d > 0 && d < 120) gaps.push(d);
      } catch {
        /* skip */
      }
    }
    if (gaps.length < 2) continue;
    const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    if (avg < 3 || avg > 60) continue;

    const last = sorted[sorted.length - 1]!;
    let since = 0;
    try {
      since = differenceInCalendarDays(ctx.now, parseISO(last.date));
    } catch {
      continue;
    }
    // Only remind when overdue (~70% past usual cadence)
    if (since < Math.round(avg * 0.9)) continue;

    const score = since - avg;
    if (!best || score > best.since - best.avgDays) {
      best = {
        name: last.name,
        avgDays: avg,
        since,
        href: memorySearchHref(last.name),
      };
    }
  }

  if (!best) return null;

  return {
    id: `purchase-frequency-${best.name}`,
    icon: "bag",
    title: "Alışkanlık hatırlatması",
    description: `“${best.name}” ürününü genelde her ${best.avgDays} günde bir alıyorsun. Son alımından ${best.since} gün geçti.`,
    priority: 78,
    href: best.href,
  };
}
