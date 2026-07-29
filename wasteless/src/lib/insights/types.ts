import type { Expense, UserCategory, UserTag } from "@/lib/types";
import type { ProductPurchase } from "./helpers";

/**
 * icon = Lucide AppIcon name (preferred). Never use misleading product photos.
 * emoji is optional accent only when it is semantically safe.
 * href = deep link so every insight answers "why?" with one tap.
 */
export type Insight = {
  id: string;
  icon: string;
  emoji?: string;
  title: string;
  description: string;
  priority: number;
  /** Required for actionable insights — exploration target. */
  href: string;
};

export type InsightContext = {
  expenses: Expense[];
  categories: UserCategory[];
  tags: UserTag[];
  now: Date;
  productPurchases?: ProductPurchase[];
};

export function memorySearchHref(query: string): string {
  const q = query.trim();
  return q ? `/memory?q=${encodeURIComponent(q)}` : "/memory";
}

export function categoryHref(id: string): string {
  return `/category?id=${encodeURIComponent(id)}`;
}

export function expenseHref(id: string): string {
  return `/expense?id=${encodeURIComponent(id)}`;
}

export function tagHref(id: string): string {
  return `/tag?id=${encodeURIComponent(id)}`;
}
