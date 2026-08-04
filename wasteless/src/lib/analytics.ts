import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameWeek,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { tr } from "date-fns/locale";
import type {
  Expense,
  ExpenseCategory,
  UserCategory,
} from "@/lib/types";
import { normalizeMerchantName, normalizeKey } from "@/lib/merchants";
import { getRootCategoryId } from "@/lib/category-hierarchy";
import {
  formatEarlyMonthInsight,
  formatSamePeriodMonthInsight,
  getSamePeriodMonthBounds,
} from "@/lib/analytics/month-comparison";
import {
  exactNormalizedEquals,
  tokenizeSearchText,
  tokensCoverQuery,
} from "@/lib/analytics/search-utils";
import { isValidFuelExpense } from "@/lib/fuel-memory";
import { toPercent } from "@/lib/utils";

export {
  formatEarlyMonthInsight,
  formatSamePeriodMonthCaption,
  formatSamePeriodMonthInsight,
  getSamePeriodMonthBounds,
  isMonthTrendReady,
  MONTH_TREND_MIN_DAY,
} from "@/lib/analytics/month-comparison";

export type PeriodScope = "day" | "week" | "month" | "year";

const weekOpts = { weekStartsOn: 1 as const };

/** Expenses that count toward spending totals (excludes in-flight / pending drafts). */
export function isSpendingExpense(expense: Expense): boolean {
  const status = expense.parseStatus;
  return (
    status !== "processing" &&
    status !== "pending_approval" &&
    status !== "failed"
  );
}

export function spendingExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter(isSpendingExpense);
}

/** Canonical merchant visit counts — one per spending expense, normalized merchant name. */
export function aggregateMerchantVisitCounts(
  expenses: Expense[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const expense of spendingExpenses(expenses)) {
    const name =
      normalizeMerchantName(expense.merchantName) ||
      expense.merchantName?.trim();
    if (!name) continue;
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return map;
}

/** Merchant with the highest visit count among spending expenses. */
export function getTopMerchantByVisits(
  expenses: Expense[]
): { name: string; count: number } | null {
  const top = Array.from(aggregateMerchantVisitCounts(expenses).entries()).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (!top || top[1] < 1) return null;
  return { name: top[0], count: top[1] };
}

function expenseMerchantNameMatchesQuery(
  expense: Expense,
  queryTokens: string[],
  queryNormalized: string
): boolean {
  const merchantFields = [expense.merchantName, expense.merchantRaw];
  for (const field of merchantFields) {
    if (exactNormalizedEquals(field, queryNormalized)) return true;
  }
  for (const field of merchantFields) {
    if (tokensCoverQuery(tokenizeSearchText(field), queryTokens)) return true;
  }
  return false;
}

/** Spending expense visits whose merchant name matches the memory search query. */
export function countMerchantVisitMatches(
  expenses: Expense[],
  query: string
): number {
  const q = query.trim();
  if (q.length < 2) return 0;
  const queryNormalized = normalizeKey(q);
  const queryTokens = tokenizeSearchText(q);
  if (!queryNormalized || queryTokens.length === 0) return 0;
  return spendingExpenses(expenses).filter((expense) =>
    expenseMerchantNameMatchesQuery(expense, queryTokens, queryNormalized)
  ).length;
}

function inRange(expense: Expense, start: Date, end: Date): boolean {
  const date = parseISO(expense.date);
  return isWithinInterval(date, { start, end });
}

function sum(expenses: Expense[]): number {
  return expenses.reduce((acc, e) => acc + (e.totalAmount || 0), 0);
}

export function getPeriodTotals(expenses: Expense[], now = new Date()) {
  const rows = spendingExpenses(expenses);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, weekOpts);
  const weekEnd = endOfWeek(now, weekOpts);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const prevDayStart = startOfDay(subDays(now, 1));
  const prevDayEnd = endOfDay(subDays(now, 1));
  const prevWeekStart = startOfWeek(subWeeks(now, 1), weekOpts);
  const prevWeekEnd = endOfWeek(subWeeks(now, 1), weekOpts);
  const prevYearStart = startOfYear(subYears(now, 1));
  const prevYearEnd = endOfYear(subYears(now, 1));

  const daily = sum(rows.filter((e) => inRange(e, todayStart, todayEnd)));
  const weekly = sum(rows.filter((e) => inRange(e, weekStart, weekEnd)));
  const monthly = sum(rows.filter((e) => inRange(e, monthStart, monthEnd)));
  const yearly = sum(rows.filter((e) => inRange(e, yearStart, yearEnd)));

  const prevDaily = sum(
    rows.filter((e) => inRange(e, prevDayStart, prevDayEnd))
  );
  const prevWeekly = sum(
    rows.filter((e) => inRange(e, prevWeekStart, prevWeekEnd))
  );
  const prevMonthBounds = getSamePeriodMonthBounds(now);
  const prevMonthly = sum(
    rows.filter((e) =>
      inRange(e, prevMonthBounds.previousStart, prevMonthBounds.previousEnd)
    )
  );
  const prevYearly = sum(
    rows.filter((e) => inRange(e, prevYearStart, prevYearEnd))
  );

  const monthlyTrend = prevMonthBounds.trendReady
    ? toPercent(monthly, prevMonthly)
    : null;

  return {
    daily,
    weekly,
    monthly,
    yearly,
    trends: {
      daily: toPercent(daily, prevDaily),
      weekly: toPercent(weekly, prevWeekly),
      monthly: monthlyTrend,
      yearly: toPercent(yearly, prevYearly),
    },
    samePeriodMonth: {
      dayCount: prevMonthBounds.dayCount,
      trendReady: prevMonthBounds.trendReady,
      current: monthly,
      previous: prevMonthly,
      trend: monthlyTrend,
    },
  };
}

export function getPeriodRange(scope: PeriodScope, now = new Date()) {
  switch (scope) {
    case "day":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return { start: startOfWeek(now, weekOpts), end: endOfWeek(now, weekOpts) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

/** Headline facts for the Hero card: total + biggest parent category + biggest merchant. */
export function getPeriodOverview(
  expenses: Expense[],
  scope: PeriodScope = "month",
  now = new Date(),
  categories: UserCategory[] = []
) {
  const { start, end } = getPeriodRange(scope, now);
  const scoped = spendingExpenses(expenses).filter((e) => inRange(e, start, end));

  const catMap = new Map<string, number>();
  const merchMap = new Map<string, number>();
  for (const e of scoped) {
    const parentId =
      categories.length > 0
        ? getRootCategoryId(e.category, categories)
        : e.category;
    catMap.set(parentId, (catMap.get(parentId) ?? 0) + (e.totalAmount || 0));
    const name = normalizeMerchantName(e.merchantName) || e.merchantName;
    if (name) merchMap.set(name, (merchMap.get(name) ?? 0) + (e.totalAmount || 0));
  }

  const topCat = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0];
  const topMerch = Array.from(merchMap.entries()).sort((a, b) => b[1] - a[1])[0];

  return {
    total: sum(scoped),
    count: scoped.length,
    largestCategory: topCat ? { category: topCat[0], total: topCat[1] } : null,
    largestMerchant: topMerch ? { name: topMerch[0], total: topMerch[1] } : null,
  };
}

export function getInsightLine(
  totals: ReturnType<typeof getPeriodTotals>
): string {
  if (totals.daily === 0) {
    return "Bugün henüz bir harcama yok 🎉";
  }
  if (totals.samePeriodMonth && !totals.samePeriodMonth.trendReady) {
    return formatEarlyMonthInsight();
  }
  if (totals.trends.monthly != null && totals.samePeriodMonth) {
    return formatSamePeriodMonthInsight(
      totals.trends.monthly,
      totals.samePeriodMonth.dayCount
    );
  }
  if (totals.trends.weekly != null && totals.trends.weekly < 0) {
    return `Bu hafta geçen haftaya göre %${Math.round(
      Math.abs(totals.trends.weekly)
    )} daha az harcadın.`;
  }
  return "Harcamalarını takip etmeye devam et.";
}

export function getCategoryBreakdown(
  expenses: Expense[],
  scope: "day" | "week" | "month" | "year" = "month",
  now = new Date()
) {
  let start: Date;
  let end: Date;
  if (scope === "day") {
    start = startOfDay(now);
    end = endOfDay(now);
  } else if (scope === "week") {
    start = startOfWeek(now, weekOpts);
    end = endOfWeek(now, weekOpts);
  } else if (scope === "year") {
    start = startOfYear(now);
    end = endOfYear(now);
  } else {
    start = startOfMonth(now);
    end = endOfMonth(now);
  }

  const filtered = spendingExpenses(expenses).filter((e) => inRange(e, start, end));
  const map = new Map<ExpenseCategory, { total: number; count: number }>();

  for (const expense of filtered) {
    const current = map.get(expense.category) ?? { total: 0, count: 0 };
    current.total += expense.totalAmount || 0;
    current.count += 1;
    map.set(expense.category, current);
  }

  return Array.from(map.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.total - a.total);
}

export type ParentBreakdownRow = {
  category: string;
  total: number;
  count: number;
  children: { category: string; total: number; count: number }[];
};

/** Dashboard rollup: parent totals with child preview rows. */
export function getParentCategoryBreakdown(
  expenses: Expense[],
  categories: UserCategory[],
  scope: PeriodScope = "month",
  now = new Date()
): ParentBreakdownRow[] {
  const leafRows = getCategoryBreakdown(expenses, scope, now);
  const parentMap = new Map<
    string,
    {
      total: number;
      count: number;
      children: Map<string, { total: number; count: number }>;
    }
  >();

  for (const row of leafRows) {
    const parentId = getRootCategoryId(row.category, categories);
    const bucket = parentMap.get(parentId) ?? {
      total: 0,
      count: 0,
      children: new Map(),
    };
    bucket.total += row.total;
    bucket.count += row.count;

    // Child preview: leaf under parent, or "parent itself" when spend is on root
    const childKey = row.category;
    const child = bucket.children.get(childKey) ?? { total: 0, count: 0 };
    child.total += row.total;
    child.count += row.count;
    bucket.children.set(childKey, child);

    parentMap.set(parentId, bucket);
  }

  return Array.from(parentMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      children: Array.from(data.children.entries())
        .map(([childId, c]) => ({ category: childId, ...c }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);
}

function getParentCategoryBreakdownInRange(
  expenses: Expense[],
  categories: UserCategory[],
  start: Date,
  end: Date
): ParentBreakdownRow[] {
  const filtered = spendingExpenses(expenses).filter((e) => inRange(e, start, end));
  const map = new Map<ExpenseCategory, { total: number; count: number }>();

  for (const expense of filtered) {
    const current = map.get(expense.category) ?? { total: 0, count: 0 };
    current.total += expense.totalAmount || 0;
    current.count += 1;
    map.set(expense.category, current);
  }

  const leafRows = Array.from(map.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.total - a.total);

  const parentMap = new Map<
    string,
    {
      total: number;
      count: number;
      children: Map<string, { total: number; count: number }>;
    }
  >();

  for (const row of leafRows) {
    const parentId = getRootCategoryId(row.category, categories);
    const bucket = parentMap.get(parentId) ?? {
      total: 0,
      count: 0,
      children: new Map(),
    };
    bucket.total += row.total;
    bucket.count += row.count;
    const child = bucket.children.get(row.category) ?? { total: 0, count: 0 };
    child.total += row.total;
    child.count += row.count;
    bucket.children.set(row.category, child);
    parentMap.set(parentId, bucket);
  }

  return Array.from(parentMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      children: Array.from(data.children.entries())
        .map(([childId, c]) => ({ category: childId, ...c }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);
}

export function getParentCategoryBreakdownWithTrend(
  expenses: Expense[],
  categories: UserCategory[],
  scope: PeriodScope = "month",
  now = new Date()
) {
  const current = getParentCategoryBreakdown(expenses, categories, scope, now);

  if (scope === "month") {
    const bounds = getSamePeriodMonthBounds(now);
    if (!bounds.trendReady) {
      return current.map((row) => ({ ...row, trend: null as number | null }));
    }
    const previous = getParentCategoryBreakdownInRange(
      expenses,
      categories,
      bounds.previousStart,
      bounds.previousEnd
    );
    const prevMap = new Map(previous.map((p) => [p.category, p.total]));
    return current.map((row) => ({
      ...row,
      trend: toPercent(row.total, prevMap.get(row.category) ?? 0),
    }));
  }

  let prevNow: Date;
  if (scope === "day") prevNow = subDays(now, 1);
  else if (scope === "week") prevNow = subWeeks(now, 1);
  else if (scope === "year") prevNow = subYears(now, 1);
  else prevNow = subMonths(now, 1);

  const previous = getParentCategoryBreakdown(
    expenses,
    categories,
    scope,
    prevNow
  );
  const prevMap = new Map(previous.map((p) => [p.category, p.total]));

  return current.map((row) => ({
    ...row,
    trend: toPercent(row.total, prevMap.get(row.category) ?? 0),
  }));
}

export function getCategoryBreakdownWithTrend(
  expenses: Expense[],
  scope: PeriodScope = "month",
  now = new Date()
) {
  const current = getCategoryBreakdown(expenses, scope, now);

  let prevNow: Date;
  if (scope === "day") prevNow = subDays(now, 1);
  else if (scope === "week") prevNow = subWeeks(now, 1);
  else if (scope === "year") prevNow = subYears(now, 1);
  else prevNow = subMonths(now, 1);

  const previous = getCategoryBreakdown(expenses, scope, prevNow);
  const prevMap = new Map(previous.map((p) => [p.category, p.total]));

  return current.map((row) => ({
    ...row,
    trend: toPercent(row.total, prevMap.get(row.category) ?? 0),
  }));
}

/** Daily spend totals for the trailing N days (zero-filled), for sparkline charts. */
export function getDailySeries(
  expenses: Expense[],
  days = 14,
  now = new Date()
): { date: string; total: number }[] {
  const end = startOfDay(now);
  const start = subDays(end, days - 1);
  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    map.set(format(addDays(start, i), "yyyy-MM-dd"), 0);
  }
  for (const expense of spendingExpenses(expenses)) {
    if (!map.has(expense.date)) continue;
    map.set(expense.date, (map.get(expense.date) ?? 0) + (expense.totalAmount || 0));
  }
  return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
}

export type DateGroup = {
  key: string;
  label: string;
  expenses: Expense[];
};

export function groupExpensesByDate(
  expenses: Expense[],
  now = new Date()
): DateGroup[] {
  const sorted = [...expenses].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const groups = new Map<string, DateGroup>();
  const lastWeekStart = startOfWeek(subWeeks(now, 1), weekOpts);
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), weekOpts);

  for (const expense of sorted) {
    const date = parseISO(expense.date);
    let key: string;
    let label: string;

    if (isSameDay(date, now)) {
      key = "today";
      label = "Bugün";
    } else if (isSameDay(date, subDays(now, 1))) {
      key = "yesterday";
      label = "Dün";
    } else if (isSameWeek(date, now, weekOpts)) {
      key = `day-${format(date, "yyyy-MM-dd")}`;
      label = format(date, "EEEE", { locale: tr });
    } else if (isWithinInterval(date, { start: lastWeekStart, end: lastWeekEnd })) {
      key = "last-week";
      label = "Geçen hafta";
    } else {
      key = format(date, "yyyy-MM-dd");
      label = format(date, "dd.MM.yyyy");
    }

    const group = groups.get(key) ?? { key, label, expenses: [] };
    group.expenses.push(expense);
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

export function getCategoryInsights(expenses: Expense[], now = new Date()) {
  const rows = spendingExpenses(expenses);
  const totalSpend = sum(rows);
  const count = rows.length;
  const averageSpend = count > 0 ? totalSpend / count : 0;
  const biggest =
    count > 0
      ? [...rows].sort((a, b) => b.totalAmount - a.totalAmount)[0]
      : null;

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthBounds = getSamePeriodMonthBounds(now);

  const thisMonth = sum(
    rows.filter((e) => inRange(e, monthStart, monthEnd))
  );
  const lastMonth = sum(
    rows.filter((e) =>
      inRange(e, monthBounds.previousStart, monthBounds.previousEnd)
    )
  );
  const monthlyTrend = monthBounds.trendReady
    ? toPercent(thisMonth, lastMonth)
    : null;

  const days = new Set(rows.map((e) => e.date)).size;
  const visitFrequency =
    days > 0 ? count / Math.max(days, 1) : 0;

  return {
    totalSpend,
    count,
    averageSpend,
    biggest,
    thisMonth,
    lastMonth,
    monthlyTrend,
    samePeriodDayCount: monthBounds.dayCount,
    samePeriodTrendReady: monthBounds.trendReady,
    uniqueDays: days,
    visitFrequency,
  };
}

export function getTagInsights(expenses: Expense[], now = new Date()) {
  const insights = getCategoryInsights(expenses, now);
  const categoryMap = new Map<string, { total: number; count: number }>();
  const merchantMap = new Map<string, { total: number; count: number }>();
  const monthMap = new Map<string, number>();

  for (const expense of expenses) {
    const cat = categoryMap.get(expense.category) ?? { total: 0, count: 0 };
    cat.total += expense.totalAmount || 0;
    cat.count += 1;
    categoryMap.set(expense.category, cat);

    const merchant =
      normalizeMerchantName(expense.merchantName) ||
      expense.merchantName ||
      "Bilinmeyen";
    const m = merchantMap.get(merchant) ?? { total: 0, count: 0 };
    m.total += expense.totalAmount || 0;
    m.count += 1;
    merchantMap.set(merchant, m);

    const monthKey = expense.date.slice(0, 7);
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + (expense.totalAmount || 0));
  }

  const categoriesBreakdown = Array.from(categoryMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.total - a.total);

  const topMerchants = Array.from(merchantMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const monthlySeries = Array.from(monthMap.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const timeline = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  return {
    ...insights,
    categoriesBreakdown,
    topMerchants,
    monthlySeries,
    timeline,
    recent: timeline.slice(0, 12),
  };
}

export function getFuelStats(expenses: Expense[]) {
  const rows = spendingExpenses(expenses).filter(isValidFuelExpense);
  const withLiters = rows.filter((e) => e.fuel?.liters && e.fuel.liters > 0);
  const withPrice = rows.filter(
    (e) => e.fuel?.pricePerLiter && e.fuel.pricePerLiter > 0
  );

  const totalSpend = sum(rows);
  const totalLiters = withLiters.reduce(
    (acc, e) => acc + (e.fuel?.liters ?? 0),
    0
  );
  const prices = withPrice.map((e) => e.fuel!.pricePerLiter!);
  const avgPrice = prices.length
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : null;

  return {
    totalSpend,
    totalLiters,
    averageLiterPrice: avgPrice,
    minLiterPrice: prices.length ? Math.min(...prices) : null,
    maxLiterPrice: prices.length ? Math.max(...prices) : null,
    fillUps: rows.length,
    entries: [...rows].sort((a, b) => b.date.localeCompare(a.date)),
    insights: getCategoryInsights(rows),
  };
}

export function getSigaraStats(expenses: Expense[]) {
  const entries = [...spendingExpenses(expenses)].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const packCount = entries.reduce(
    (acc, e) => acc + (e.packCount ?? (e.totalAmount > 0 ? 1 : 0)),
    0
  );
  return {
    totalSpend: sum(entries),
    purchaseCount: entries.length,
    packCount,
    entries,
    insights: getCategoryInsights(entries),
  };
}

export function getMerchantCategoryStats(expenses: Expense[]) {
  const entries = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  const merchantMap = new Map<string, { total: number; count: number }>();
  for (const entry of entries) {
    const name =
      normalizeMerchantName(entry.merchantName) ||
      entry.merchantName?.trim() ||
      "Bilinmeyen";
    const current = merchantMap.get(name) ?? { total: 0, count: 0 };
    current.total += entry.totalAmount;
    current.count += 1;
    merchantMap.set(name, current);
  }

  const merchants = Array.from(merchantMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total);

  const mostExpensive = [...entries]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

  const recentItems = entries
    .flatMap((e) =>
      e.items.map((item) => ({
        ...item,
        expenseId: e.id,
        date: e.date,
        merchantName: normalizeMerchantName(e.merchantName) || e.merchantName,
      }))
    )
    .slice(0, 20);

  return {
    totalSpend: sum(entries),
    visitCount: entries.length,
    merchants,
    topMerchants: merchants.slice(0, 5),
    mostExpensive,
    recentItems,
    entries,
    insights: getCategoryInsights(entries),
  };
}

/** @deprecated use getMerchantCategoryStats — kept for compatibility */
export function getYemeIcmeStats(expenses: Expense[]) {
  return getMerchantCategoryStats(expenses);
}

export {
  buildPurchaseIndex,
  searchPurchaseIndex,
  searchPurchaseMemory,
  getCategoryProductStats,
  getCategoryProductStatsFromIndex,
  indexToInsightPurchases,
  productFrequency,
  rebuildIndexProducesSameStats,
} from "@/lib/analytics/purchase-index";

export type {
  PurchaseIndex,
  PurchaseRecord,
  PurchaseMemoryHit,
  PurchaseMemoryResult,
  ProductSort,
  ProductPurchaseHit,
  ProductMerchantStat,
  CategoryProductStat,
  InsightProductPurchase,
} from "@/lib/analytics/purchase-index";

export type CarSpendKind =
  | "yakit"
  | "bakim"
  | "lastik"
  | "otopark"
  | "sigorta"
  | "yikama"
  | "diger";

export const CAR_SPEND_LABELS: Record<CarSpendKind, string> = {
  yakit: "Yakıt",
  bakim: "Bakım / servis",
  lastik: "Lastik",
  otopark: "Otopark",
  sigorta: "Sigorta",
  yikama: "Yıkama",
  diger: "Diğer",
};

export function classifyCarSpend(expense: Expense): CarSpendKind {
  if (expense.fuel || expense.category === "akaryakit") return "yakit";

  const blob = normalizeKey(
    [
      expense.subcategory,
      expense.merchantName,
      expense.merchantRaw,
      expense.notes,
      ...(expense.items ?? []).map((i) => i.name),
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (/lastik|oto\s*last|lassa|michelin|bridgestone|goodyear|petlas/.test(blob))
    return "lastik";
  if (/otopark|parking|park\b|ispark|otopark/.test(blob)) return "otopark";
  if (/sigorta|kasko|trafik\s*sigorta|aksigorta|anadolu\s*sigorta/.test(blob))
    return "sigorta";
  if (/yika|yıkama|oto\s*yika|wash|detay/.test(blob)) return "yikama";
  if (
    /bakim|servis|ustası|ustasi|yağ\s*degisim|yag\s*degisim|filtre|fren|balata|egzoz|mekanik|oto\s*ekspertiz/.test(
      blob
    )
  )
    return "bakim";
  if (/benzin|motorin|lpg|akaryakit|shell|opet|bp\b|po\b|total|aytemiz/.test(blob))
    return "yakit";

  return "diger";
}

export const CAR_SPEND_TO_CATEGORY: Record<CarSpendKind, string> = {
  yakit: "akaryakit",
  bakim: "araba_bakim",
  lastik: "araba_lastik",
  otopark: "araba_otopark",
  sigorta: "araba_sigorta",
  yikama: "araba_yikama",
  diger: "araba",
};

/** Map free-text / legacy subcategory labels → Araba child category id. */
export function mapArabaSubcategoryToChildId(
  subcategory: string | null | undefined
): string | null {
  if (!subcategory?.trim()) return null;
  const key = normalizeKey(subcategory);
  const map: Record<string, string> = {
    fuel: "akaryakit",
    yakit: "akaryakit",
    akaryakit: "akaryakit",
    benzin: "akaryakit",
    motorin: "akaryakit",
    lpg: "akaryakit",
    insurance: "araba_sigorta",
    sigorta: "araba_sigorta",
    kasko: "araba_sigorta",
    maintenance: "araba_bakim",
    bakim: "araba_bakim",
    highway: "araba_otoyol",
    otoyol: "araba_otoyol",
    hgs: "araba_otoyol",
    parking: "araba_otopark",
    otopark: "araba_otopark",
    wash: "araba_yikama",
    yikama: "araba_yikama",
    penalty: "araba_ceza",
    ceza: "araba_ceza",
    mtv: "araba_mtv",
    tire: "araba_lastik",
    lastik: "araba_lastik",
  };
  return map[key] ?? null;
}

export type CarSpendBucket = {
  kind: CarSpendKind;
  label: string;
  total: number;
  count: number;
  entries: Expense[];
};

/** Araba + ilgili akaryakıt harcamalarını türlerine ayırır. */
export function getCarSpendBreakdown(
  expenses: Expense[],
  options?: { includeFuelCategory?: boolean }
): CarSpendBucket[] {
  const includeFuel = options?.includeFuelCategory !== false;
  const relevant = expenses.filter(
    (e) =>
      e.category === "araba" ||
      (includeFuel && (e.category === "akaryakit" || !!e.fuel))
  );

  const buckets = new Map<CarSpendKind, CarSpendBucket>();
  for (const kind of Object.keys(CAR_SPEND_LABELS) as CarSpendKind[]) {
    buckets.set(kind, {
      kind,
      label: CAR_SPEND_LABELS[kind],
      total: 0,
      count: 0,
      entries: [],
    });
  }

  for (const expense of relevant) {
    const kind = classifyCarSpend(expense);
    const bucket = buckets.get(kind)!;
    bucket.total += expense.totalAmount || 0;
    bucket.count += 1;
    bucket.entries.push(expense);
  }

  for (const bucket of Array.from(buckets.values())) {
    bucket.entries.sort((a, b) => b.date.localeCompare(a.date));
  }

  return Array.from(buckets.values())
    .filter((b) => b.count > 0)
    .sort((a, b) => b.total - a.total);
}
