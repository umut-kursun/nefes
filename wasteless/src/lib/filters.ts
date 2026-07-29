import { isWithinInterval, parseISO } from "date-fns";
import type { Expense, UserCategory } from "@/lib/types";
import { getChildren, hasChildren } from "@/lib/category-hierarchy";
import { normalizeKey, normalizeMerchantName } from "@/lib/merchants";

export type ExpenseFilters = {
  categoryId?: string | null;
  tagId?: string | null;
  merchant?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export function filterExpenses(
  expenses: Expense[],
  filters: ExpenseFilters,
  categories: UserCategory[] = []
): Expense[] {
  const categoryId = filters.categoryId?.trim() || null;
  const tagId = filters.tagId?.trim() || null;
  const merchantNeedle = filters.merchant?.trim()
    ? normalizeKey(filters.merchant.trim())
    : null;
  const from = filters.dateFrom || null;
  const to = filters.dateTo || null;

  const categoryMatchIds = (() => {
    if (!categoryId) return null as Set<string> | null;
    if (categories.length > 0 && hasChildren(categoryId, categories)) {
      return new Set([
        categoryId,
        ...getChildren(categoryId, categories).map((c) => c.id),
      ]);
    }
    return new Set([categoryId]);
  })();

  return expenses.filter((expense) => {
    if (categoryMatchIds && !categoryMatchIds.has(expense.category)) {
      return false;
    }

    if (tagId) {
      const ids = expense.tagIds ?? [];
      if (!ids.includes(tagId)) return false;
    }

    if (merchantNeedle) {
      const name =
        normalizeMerchantName(expense.merchantName) ||
        expense.merchantName ||
        expense.merchantRaw ||
        "";
      const blob = normalizeKey(`${name} ${expense.merchantRaw ?? ""}`);
      if (!blob.includes(merchantNeedle)) return false;
    }

    if (from || to) {
      const date = parseISO(expense.date);
      const start = from ? parseISO(from) : new Date(1970, 0, 1);
      const end = to ? parseISO(to) : new Date(2100, 0, 1);
      if (!isWithinInterval(date, { start, end })) return false;
    }

    return true;
  });
}

export function uniqueMerchants(expenses: Expense[]): string[] {
  const set = new Set<string>();
  for (const expense of expenses) {
    const name =
      normalizeMerchantName(expense.merchantName) ||
      expense.merchantName?.trim();
    if (name) set.add(name);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
}
