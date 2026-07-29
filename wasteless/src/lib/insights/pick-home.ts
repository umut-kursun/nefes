import type { Insight } from "./types";

export type InsightFamily =
  | "price"
  | "habit"
  | "merchant"
  | "category"
  | "record"
  | "comparison"
  | "other";

const FAMILY_BY_PREFIX: Array<{ match: RegExp; family: InsightFamily }> = [
  { match: /^price-|cheapest-merchant/, family: "price" },
  { match: /^most-visited|cheapest-merchant/, family: "merchant" },
  { match: /^highest-spending-category|monthly-comparison/, family: "category" },
  {
    match: /^most-purchased|highest-spending-product|purchase-frequency|days-since/,
    family: "habit",
  },
  {
    match: /^largest-purchase|purchase-milestone|average-receipt|average-fuel/,
    family: "record",
  },
  { match: /^monthly-comparison|shopping-weekday/, family: "comparison" },
];

export function insightFamily(id: string): InsightFamily {
  for (const row of FAMILY_BY_PREFIX) {
    if (row.match.test(id)) return row.family;
  }
  return "other";
}

const SESSION_KEY = "wl_home_insight_shown";

function readShown(): string[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeShown(ids: string[]) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(ids.slice(-24)));
  } catch {
    /* ignore */
  }
}

/**
 * Pick a diverse, non-repetitive subset for the Home Assistant rotator.
 * Prefer high priority, then family spread, then de-prioritize recently shown.
 */
export function pickHomeInsights(
  pool: Insight[],
  limit = 6
): Insight[] {
  if (pool.length === 0) return [];
  const shown = new Set(readShown());
  const sorted = [...pool].sort((a, b) => {
    const aSeen = shown.has(a.id) ? 1 : 0;
    const bSeen = shown.has(b.id) ? 1 : 0;
    if (aSeen !== bSeen) return aSeen - bSeen;
    return b.priority - a.priority;
  });

  const picked: Insight[] = [];
  const usedFamilies = new Set<InsightFamily>();

  // Pass 1: one per family
  for (const insight of sorted) {
    if (picked.length >= limit) break;
    const family = insightFamily(insight.id);
    if (usedFamilies.has(family)) continue;
    picked.push(insight);
    usedFamilies.add(family);
  }

  // Pass 2: fill remaining by priority
  for (const insight of sorted) {
    if (picked.length >= limit) break;
    if (picked.some((p) => p.id === insight.id)) continue;
    picked.push(insight);
  }

  // Remember what we surfaced this session (for next Home visit / remount)
  writeShown([...readShown(), ...picked.map((p) => p.id)]);

  // Rotate start so the first card isn't always the same family
  if (picked.length > 1) {
    const offset = readShown().length % picked.length;
    return [...picked.slice(offset), ...picked.slice(0, offset)];
  }
  return picked;
}
