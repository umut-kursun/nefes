import type { Expense } from "@/lib/types";

const RECENT_LIMIT = 20;

function recentExpenses(expenses: Expense[]): Expense[] {
  return [...expenses]
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      const byTime = (b.time || "").localeCompare(a.time || "");
      if (byTime !== 0) return byTime;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    })
    .slice(0, RECENT_LIMIT);
}

/** Unique merchant names from the last 20 expenses, most recent first. */
export function getRecentMerchants(expenses: Expense[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const e of recentExpenses(expenses)) {
    const name = e.merchantName?.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/** Unique category ids from the last 20 expenses, most recent first. */
export function getRecentCategories(expenses: Expense[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const e of recentExpenses(expenses)) {
    const cat = e.category?.trim();
    if (!cat) continue;
    if (seen.has(cat)) continue;
    seen.add(cat);
    result.push(cat);
  }
  return result;
}
