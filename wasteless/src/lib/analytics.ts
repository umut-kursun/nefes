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
  ReceiptItem,
  UserCategory,
} from "@/lib/types";
import { normalizeMerchantName, normalizeKey } from "@/lib/merchants";
import { computeUnitPrice, normalizeProductName } from "@/lib/products";
import { getRootCategoryId } from "@/lib/category-hierarchy";
import { toPercent } from "@/lib/utils";

export type PeriodScope = "day" | "week" | "month" | "year";

const weekOpts = { weekStartsOn: 1 as const };

function inRange(expense: Expense, start: Date, end: Date): boolean {
  const date = parseISO(expense.date);
  return isWithinInterval(date, { start, end });
}

function sum(expenses: Expense[]): number {
  return expenses.reduce((acc, e) => acc + (e.totalAmount || 0), 0);
}

export function getPeriodTotals(expenses: Expense[], now = new Date()) {
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
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));
  const prevYearStart = startOfYear(subYears(now, 1));
  const prevYearEnd = endOfYear(subYears(now, 1));

  const daily = sum(expenses.filter((e) => inRange(e, todayStart, todayEnd)));
  const weekly = sum(expenses.filter((e) => inRange(e, weekStart, weekEnd)));
  const monthly = sum(expenses.filter((e) => inRange(e, monthStart, monthEnd)));
  const yearly = sum(expenses.filter((e) => inRange(e, yearStart, yearEnd)));

  const prevDaily = sum(
    expenses.filter((e) => inRange(e, prevDayStart, prevDayEnd))
  );
  const prevWeekly = sum(
    expenses.filter((e) => inRange(e, prevWeekStart, prevWeekEnd))
  );
  const prevMonthly = sum(
    expenses.filter((e) => inRange(e, prevMonthStart, prevMonthEnd))
  );
  const prevYearly = sum(
    expenses.filter((e) => inRange(e, prevYearStart, prevYearEnd))
  );

  return {
    daily,
    weekly,
    monthly,
    yearly,
    trends: {
      daily: toPercent(daily, prevDaily),
      weekly: toPercent(weekly, prevWeekly),
      monthly: toPercent(monthly, prevMonthly),
      yearly: toPercent(yearly, prevYearly),
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
  const scoped = expenses.filter((e) => inRange(e, start, end));

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
  if (totals.trends.monthly != null) {
    const abs = Math.round(Math.abs(totals.trends.monthly));
    if (totals.trends.monthly < 0) {
      return `Bu ay geçen aya göre %${abs} daha az harcadın.`;
    }
    if (totals.trends.monthly > 0) {
      return `Bu ay geçen aya göre %${abs} daha fazla harcadın.`;
    }
    return "Bu ay geçen ay ile aynı seviyedesin.";
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

  const filtered = expenses.filter((e) => inRange(e, start, end));
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

export function getParentCategoryBreakdownWithTrend(
  expenses: Expense[],
  categories: UserCategory[],
  scope: PeriodScope = "month",
  now = new Date()
) {
  const current = getParentCategoryBreakdown(expenses, categories, scope, now);

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
  for (const expense of expenses) {
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
  const totalSpend = sum(expenses);
  const count = expenses.length;
  const averageSpend = count > 0 ? totalSpend / count : 0;
  const biggest =
    count > 0
      ? [...expenses].sort((a, b) => b.totalAmount - a.totalAmount)[0]
      : null;

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  const thisMonth = sum(
    expenses.filter((e) => inRange(e, monthStart, monthEnd))
  );
  const lastMonth = sum(
    expenses.filter((e) => inRange(e, prevMonthStart, prevMonthEnd))
  );
  const monthlyTrend = toPercent(thisMonth, lastMonth);

  const days = new Set(expenses.map((e) => e.date)).size;
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
    uniqueDays: days,
    visitFrequency,
  };
}

export function getFuelStats(expenses: Expense[]) {
  // Caller already scopes the list (e.g. category filter).
  const rows = expenses;
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
  const avgPrice =
    totalLiters > 0
      ? totalSpend / totalLiters
      : prices.length
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
  const entries = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
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

/** Fold Turkish diacritics so query matching is accent/case-insensitive. */
function foldQuery(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

const TOBACCO_QUERY_TERMS = [
  "sigara",
  "tutun",
  "puro",
  "tobacco",
  "cigarette",
  "marlboro",
  "parliament",
  "camel",
  "winston",
  "kent",
  "muratti",
  "chesterfield",
  "tekel",
  "davidoff",
  "rothmans",
  "lark",
  "monte carlo",
];

/** True when a Purchase Memory query is about tobacco/cigarettes. */
export function isTobaccoQuery(query: string): boolean {
  const q = foldQuery(query.trim());
  if (q.length < 2) return false;
  return TOBACCO_QUERY_TERMS.some((term) => q.includes(term));
}

export type TobaccoMerchantBreakdown = {
  name: string;
  packs: number;
  spend: number;
  purchaseCount: number;
};

export type TobaccoAnalysis = {
  totalPacks: number;
  totalSpend: number;
  purchaseCount: number;
  /** Average price per pack (₺/paket), null when no packs are recorded. */
  averagePricePerPack: number | null;
  merchants: TobaccoMerchantBreakdown[];
};

/**
 * Analytical breakdown for the Purchase Memory "Tütün Analizi" card.
 * Aggregates every cigarette-category expense: total packs, average price per
 * pack, and a per-merchant split (e.g. Migros vs. Tekel Bayi).
 */
export function getTobaccoAnalysis(expenses: Expense[]): TobaccoAnalysis {
  const rows = expenses.filter((e) => e.category === "sigara");
  const packsFor = (e: Expense): number =>
    e.packCount ?? (e.totalAmount > 0 ? 1 : 0);

  const totalPacks = rows.reduce((acc, e) => acc + packsFor(e), 0);
  const totalSpend = sum(rows);

  const merchantMap = new Map<string, TobaccoMerchantBreakdown>();
  for (const e of rows) {
    const name =
      normalizeMerchantName(e.merchantName) ||
      e.merchantName?.trim() ||
      "Bilinmeyen";
    const current =
      merchantMap.get(name) ??
      ({ name, packs: 0, spend: 0, purchaseCount: 0 } as TobaccoMerchantBreakdown);
    current.packs += packsFor(e);
    current.spend += e.totalAmount;
    current.purchaseCount += 1;
    merchantMap.set(name, current);
  }

  const merchants = Array.from(merchantMap.values()).sort(
    (a, b) => b.spend - a.spend
  );

  return {
    totalPacks,
    totalSpend,
    purchaseCount: rows.length,
    averagePricePerPack: totalPacks > 0 ? totalSpend / totalPacks : null,
    merchants,
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

export type PurchaseMemoryHit = {
  itemName: string;
  normalizedName: string | null;
  rawText: string | null;
  expenseId: string;
  date: string;
  store: string | null;
  price: number | null;
  unitPrice: number | null;
  unitLabel: string | null;
  quantity: number | null;
  unit: string | null;
  currency: string;
  hasReceipt: boolean;
};

export type PurchaseMemoryResult = {
  query: string;
  /** Best display title for the memory (product or merchant). */
  displayName: string;
  hits: PurchaseMemoryHit[];
  last: PurchaseMemoryHit | null;
  previous: PurchaseMemoryHit[];
  first: PurchaseMemoryHit | null;
  purchaseCount: number;
  merchantCount: number;
  /** @deprecated prefer priceChangePct (vs previous purchase) */
  priceTrend: number | null;
  /** @deprecated prefer priceChangePct */
  priceIncreasePct: number | null;
  /** Change vs immediately previous purchase (unit price preferred). */
  priceChangePct: number | null;
  previousComparablePrice: number | null;
  latestComparablePrice: number | null;
  priceCompareLabel: string;
  averagePrice: number | null;
  highestPrice: number | null;
  lowestPrice: number | null;
  averageUnitPrice: number | null;
  latestUnitPrice: number | null;
  lowestUnitPrice: number | null;
  highestUnitPrice: number | null;
  unitLabel: string | null;
  /** Average days between purchases (null if < 2). */
  averageDaysBetween: number | null;
  mostFrequentMerchant: string | null;
  mostExpensive: PurchaseMemoryHit | null;
  cheapest: PurchaseMemoryHit | null;
  stores: string[];
};

/**
 * Purchase Memory match priority (lower = better).
 * 1 exact product · 2 exact merchant · 3 whole-word product ·
 * 4 whole-word merchant · 5 notes · 6 OCR text
 */
const MATCH_EXACT_PRODUCT = 1;
const MATCH_EXACT_MERCHANT = 2;
const MATCH_WORD_PRODUCT = 3;
const MATCH_WORD_MERCHANT = 4;
const MATCH_NOTES = 5;
const MATCH_OCR = 6;

/**
 * Normalized Turkish inflectional endings. Used so "yemek" can match
 * "yemeği"→"yemegi" without bringing back substring matches like "su"→"susam".
 * Only applied when the query token length is >= 4.
 */
const SEARCH_TOKEN_SUFFIXES = new Set([
  "i",
  "u",
  "a",
  "e",
  "si",
  "su",
  "sa",
  "se",
  "yi",
  "yu",
  "ya",
  "ye",
  "gi",
  "gu",
  "ga",
  "ge",
  "ni",
  "nu",
  "na",
  "ne",
  "li",
  "lu",
  "la",
  "le",
  "siz",
  "suz",
  "saz",
  "sez",
  "ler",
  "lar",
  "leri",
  "lari",
  "in",
  "un",
  "an",
  "en",
  "nin",
  "nun",
  "nan",
  "nen",
  "de",
  "da",
  "te",
  "ta",
  "den",
  "dan",
  "ten",
  "tan",
  "yle",
  "yla",
  "dir",
  "dur",
  "dar",
  "der",
  "mis",
  "mus",
  "mas",
  "mes",
]);

/** Final-consonant softening after normalizeKey (k→ğ→g, p→b, ç→c, t→d). */
const SEARCH_SOFT_FINAL: Record<string, string> = {
  k: "g",
  p: "b",
  c: "c",
  t: "d",
};

function tokenizeSearchText(value: string | null | undefined): string[] {
  if (!value) return [];
  const normalized = normalizeKey(value);
  if (!normalized) return [];
  // Hyphens / punctuation already become spaces in normalizeKey, so
  // "Coca-Cola 330 ml" → ["coca","cola","330","ml"] (size tokens kept).
  return normalized.split(/\s+/).filter(Boolean);
}

/** Numeric / decimal tokens — pack size, weight, volume. */
function isSizeToken(token: string): boolean {
  return /^\d+(?:[.,]\d+)?$/.test(token);
}

function softStemToken(token: string): string | null {
  if (token.length < 2) return null;
  const soft = SEARCH_SOFT_FINAL[token[token.length - 1]!];
  if (!soft) return null;
  return token.slice(0, -1) + soft;
}

function tokenHasInflection(stem: string, candidate: string): boolean {
  if (candidate.startsWith(stem)) {
    const rem = candidate.slice(stem.length);
    if (SEARCH_TOKEN_SUFFIXES.has(rem)) return true;
  }
  const soft = softStemToken(stem);
  if (soft && candidate.startsWith(soft)) {
    const rem = candidate.slice(soft.length);
    if (SEARCH_TOKEN_SUFFIXES.has(rem)) return true;
  }
  return false;
}

function searchTokensEqual(a: string, b: string): boolean {
  if (a === b) return true;
  // Inflectional / softened stem match (min length blocks "su"→"susam", "sus"→"susam")
  if (a.length >= 4 && tokenHasInflection(a, b)) return true;
  if (b.length >= 4 && tokenHasInflection(b, a)) return true;
  return false;
}

/** Every query token must match some field token (whole-word / inflection). */
function tokensCoverQuery(
  fieldTokens: string[],
  queryTokens: string[]
): boolean {
  if (queryTokens.length === 0 || fieldTokens.length === 0) return false;
  return queryTokens.every((qt) =>
    fieldTokens.some((ft) => searchTokensEqual(qt, ft))
  );
}

/**
 * Higher = more specific product identity match.
 * Prefers full query coverage with size-token hits and tighter token overlap
 * so "cola 330" ranks "Coca-Cola 330 ml" above looser / longer brand variants.
 */
function productMatchSpecificity(
  fieldTokens: string[],
  queryTokens: string[]
): number {
  if (queryTokens.length === 0 || fieldTokens.length === 0) return 0;
  let matched = 0;
  let sizeHits = 0;
  for (const qt of queryTokens) {
    if (!fieldTokens.some((ft) => searchTokensEqual(qt, ft))) continue;
    matched += 1;
    if (isSizeToken(qt)) sizeHits += 1;
  }
  if (matched === 0) return 0;
  const overlap =
    fieldTokens.length > 0 ? matched / fieldTokens.length : 0;
  return matched * 100 + sizeHits * 10 + overlap;
}

function exactNormalizedEquals(
  value: string | null | undefined,
  queryNormalized: string
): boolean {
  if (!value) return false;
  const n = normalizeKey(value);
  return n.length > 0 && n === queryNormalized;
}

type MatchVerdict = { rank: number; specificity: number };

function bestItemMatchRank(
  item: ReceiptItem,
  queryTokens: string[],
  queryNormalized: string
): MatchVerdict | null {
  const productFields = [item.normalizedName, item.name].filter(
    Boolean
  ) as string[];
  // Identity-aware display name (keeps size / flavor / variant).
  const identityName =
    normalizeProductName(item.name) ||
    item.normalizedName ||
    item.name ||
    null;
  if (identityName && !productFields.includes(identityName)) {
    productFields.unshift(identityName);
  }

  for (const field of productFields) {
    if (exactNormalizedEquals(field, queryNormalized)) {
      return {
        rank: MATCH_EXACT_PRODUCT,
        specificity: 1000 + productMatchSpecificity(
          tokenizeSearchText(field),
          queryTokens
        ),
      };
    }
  }

  let bestWord: MatchVerdict | null = null;
  for (const field of productFields) {
    const fieldTokens = tokenizeSearchText(field);
    if (!tokensCoverQuery(fieldTokens, queryTokens)) continue;
    const specificity = productMatchSpecificity(fieldTokens, queryTokens);
    if (!bestWord || specificity > bestWord.specificity) {
      bestWord = { rank: MATCH_WORD_PRODUCT, specificity };
    }
  }
  if (bestWord) return bestWord;

  // Line-item OCR only — never expense.rawText / merchant / notes here.
  // Those are receipt-wide and would mark every sibling line as a hit.
  if (tokensCoverQuery(tokenizeSearchText(item.rawText), queryTokens)) {
    return { rank: MATCH_OCR, specificity: 0 };
  }

  return null;
}

function bestMerchantMatchRank(
  expense: Expense,
  queryTokens: string[],
  queryNormalized: string
): MatchVerdict | null {
  const merchantFields = [expense.merchantName, expense.merchantRaw];
  for (const field of merchantFields) {
    if (exactNormalizedEquals(field, queryNormalized)) {
      return { rank: MATCH_EXACT_MERCHANT, specificity: 0 };
    }
  }
  for (const field of merchantFields) {
    if (tokensCoverQuery(tokenizeSearchText(field), queryTokens)) {
      return { rank: MATCH_WORD_MERCHANT, specificity: 0 };
    }
  }
  if (tokensCoverQuery(tokenizeSearchText(expense.notes), queryTokens)) {
    return { rank: MATCH_NOTES, specificity: 0 };
  }
  if (tokensCoverQuery(tokenizeSearchText(expense.rawText), queryTokens)) {
    return { rank: MATCH_OCR, specificity: 0 };
  }
  return null;
}

function effectivePrice(hit: PurchaseMemoryHit): number | null {
  return hit.unitPrice ?? hit.price;
}

function modeLabel(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return (
    Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  );
}

type RankedMemoryHit = PurchaseMemoryHit & {
  matchRank: number;
  matchSpecificity: number;
};

export function searchPurchaseMemory(
  expenses: Expense[],
  query: string
): PurchaseMemoryResult | null {
  const q = query.trim();
  if (q.length < 2) return null;

  const queryNormalized = normalizeKey(q);
  const queryTokens = tokenizeSearchText(q);
  if (!queryNormalized || queryTokens.length === 0) return null;

  const rankedHits: RankedMemoryHit[] = [];

  for (const expense of expenses) {
    let anyItemMatched = false;

    for (const item of expense.items) {
      const verdict = bestItemMatchRank(
        item,
        queryTokens,
        queryNormalized
      );
      if (verdict == null) continue;
      anyItemMatched = true;
      const unitInfo = computeUnitPrice({
        totalPrice: item.totalPrice ?? expense.totalAmount,
        quantity: item.quantity,
        unit: item.unit,
        name: item.name,
        existingUnitPrice: item.unitPrice,
      });
      const identityName =
        normalizeProductName(item.name) ||
        item.normalizedName ||
        item.name;
      rankedHits.push({
        itemName: identityName,
        normalizedName: item.normalizedName,
        rawText: item.rawText,
        expenseId: expense.id,
        date: expense.date,
        store:
          normalizeMerchantName(expense.merchantName) || expense.merchantName,
        price: item.totalPrice ?? expense.totalAmount,
        unitPrice: unitInfo.unitPrice,
        unitLabel: unitInfo.unitLabel,
        quantity: item.quantity ?? unitInfo.packAmount,
        unit: item.unit ?? unitInfo.packUnit,
        currency: expense.currency,
        hasReceipt: !!expense.imageDataUrl,
        matchRank: verdict.rank,
        matchSpecificity: verdict.specificity,
      });
    }

    // Merchant / notes / OCR visit when no line item matched
    if (!anyItemMatched) {
      const merchantVerdict = bestMerchantMatchRank(
        expense,
        queryTokens,
        queryNormalized
      );
      if (merchantVerdict != null) {
        rankedHits.push({
          itemName: expense.merchantName || q,
          normalizedName: null,
          rawText: null,
          expenseId: expense.id,
          date: expense.date,
          store:
            normalizeMerchantName(expense.merchantName) || expense.merchantName,
          price: expense.totalAmount,
          unitPrice: null,
          unitLabel: null,
          quantity: null,
          unit: null,
          currency: expense.currency,
          hasReceipt: !!expense.imageDataUrl,
          matchRank: merchantVerdict.rank,
          matchSpecificity: merchantVerdict.specificity,
        });
      }
    }
  }

  // Timeline stays chronological; matchRank + specificity drive displayName.
  rankedHits.sort((a, b) => b.date.localeCompare(a.date));

  const hits: PurchaseMemoryHit[] = rankedHits.map((ranked) => {
    const hit: PurchaseMemoryHit = {
      itemName: ranked.itemName,
      normalizedName: ranked.normalizedName,
      rawText: ranked.rawText,
      expenseId: ranked.expenseId,
      date: ranked.date,
      store: ranked.store,
      price: ranked.price,
      unitPrice: ranked.unitPrice,
      unitLabel: ranked.unitLabel,
      quantity: ranked.quantity,
      unit: ranked.unit,
      currency: ranked.currency,
      hasReceipt: ranked.hasReceipt,
    };
    return hit;
  });

  const last = hits[0] ?? null;
  const previous = hits.slice(1);
  const first = hits.length ? hits[hits.length - 1]! : null;

  const priced = hits
    .map((h) => ({ hit: h, value: effectivePrice(h) }))
    .filter((x): x is { hit: PurchaseMemoryHit; value: number } => x.value != null);

  // Compare latest vs immediately previous purchase (not oldest)
  let priceChangePct: number | null = null;
  let previousComparablePrice: number | null = null;
  let latestComparablePrice: number | null = null;
  if (priced.length >= 2) {
    latestComparablePrice = priced[0]!.value;
    previousComparablePrice = priced[1]!.value;
    priceChangePct = toPercent(latestComparablePrice, previousComparablePrice);
  }

  const values = priced.map((p) => p.value);
  const unitValues = hits
    .map((h) => h.unitPrice)
    .filter((v): v is number => v != null);

  const stores = Array.from(
    new Set(hits.map((h) => h.store).filter(Boolean) as string[])
  );

  // Frequency: average days between unique purchase dates (newest→oldest)
  let averageDaysBetween: number | null = null;
  const uniqueDates = Array.from(new Set(hits.map((h) => h.date))).sort((a, b) =>
    b.localeCompare(a)
  );
  if (uniqueDates.length >= 2) {
    const gaps: number[] = [];
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const newer = parseISO(uniqueDates[i]!);
      const older = parseISO(uniqueDates[i + 1]!);
      const gap = Math.round(
        (newer.getTime() - older.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (gap > 0) gaps.push(gap);
    }
    if (gaps.length) {
      averageDaysBetween = Math.round(
        gaps.reduce((a, b) => a + b, 0) / gaps.length
      );
    }
  }

  const storeVisits = hits
    .map((h) => h.store)
    .filter((s): s is string => !!s);
  const mostFrequentMerchant = modeLabel(storeVisits);

  let mostExpensive: PurchaseMemoryHit | null = null;
  let cheapest: PurchaseMemoryHit | null = null;
  for (const { hit, value } of priced) {
    if (!mostExpensive || value > (effectivePrice(mostExpensive) ?? -Infinity)) {
      mostExpensive = hit;
    }
    if (!cheapest || value < (effectivePrice(cheapest) ?? Infinity)) {
      cheapest = hit;
    }
  }

  const unitLabel =
    last?.unitLabel ||
    hits.find((h) => h.unitLabel)?.unitLabel ||
    null;

  const bestRank = rankedHits.reduce(
    (min, h) => Math.min(min, h.matchRank),
    Number.POSITIVE_INFINITY
  );
  const topRankHits = rankedHits.filter((h) => h.matchRank === bestRank);
  const bestSpecificity = topRankHits.reduce(
    (max, h) => Math.max(max, h.matchSpecificity),
    0
  );
  const preferredNames = topRankHits
    .filter((h) => h.matchSpecificity === bestSpecificity)
    .map((h) => h.itemName)
    .filter(Boolean);
  const displayName =
    modeLabel(preferredNames) ||
    modeLabel(hits.map((h) => h.itemName).filter(Boolean)) ||
    last?.itemName ||
    q;

  return {
    query: q,
    displayName,
    hits,
    last,
    previous,
    first,
    purchaseCount: hits.length,
    merchantCount: stores.length,
    priceTrend: priceChangePct,
    priceIncreasePct: priceChangePct,
    priceChangePct,
    previousComparablePrice,
    latestComparablePrice,
    priceCompareLabel: "önceki alımına göre",
    averagePrice: values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null,
    highestPrice: values.length ? Math.max(...values) : null,
    lowestPrice: values.length ? Math.min(...values) : null,
    averageUnitPrice: unitValues.length
      ? unitValues.reduce((a, b) => a + b, 0) / unitValues.length
      : null,
    latestUnitPrice: last?.unitPrice ?? null,
    lowestUnitPrice: unitValues.length ? Math.min(...unitValues) : null,
    highestUnitPrice: unitValues.length ? Math.max(...unitValues) : null,
    unitLabel,
    averageDaysBetween,
    mostFrequentMerchant,
    mostExpensive,
    cheapest,
    stores,
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

export function getTopMerchants(
  expenses: Expense[],
  scope: PeriodScope = "month",
  now = new Date(),
  limit = 4
): { name: string; total: number }[] {
  const { start, end } = getPeriodRange(scope, now);
  const scoped = expenses.filter((e) => inRange(e, start, end));
  const map = new Map<string, number>();
  for (const e of scoped) {
    const name = normalizeMerchantName(e.merchantName) || e.merchantName;
    if (name) map.set(name, (map.get(name) ?? 0) + (e.totalAmount || 0));
  }
  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export type SmartInsight = { id: string; text: string };

/**
 * Small, explainable heuristics over local data — no network call.
 * Rotated daily via pickDailyInsight so the home screen always shows
 * exactly one, but the pool stays fresh as more purchases are recorded.
 */
export function getSmartInsights(
  expenses: Expense[],
  categories: UserCategory[],
  now = new Date()
): SmartInsight[] {
  const insights: SmartInsight[] = [];

  // Strongest first: this month's dominant category share.
  const monthOverview = getPeriodOverview(expenses, "month", now, categories);
  if (monthOverview.total > 0 && monthOverview.largestCategory) {
    const largest = monthOverview.largestCategory;
    const share = Math.round((largest.total / monthOverview.total) * 100);
    if (share >= 25) {
      const meta = categories.find((c) => c.id === largest.category);
      insights.push({
        id: "cat-share",
        text: `Bu ay harcamanın %${share}'i ${meta?.label ?? "tek kategori"} oldu.`,
      });
    }
  }

  // Weekly merchant visit frequency.
  const week = getPeriodRange("week", now);
  const weekly = expenses.filter((e) => inRange(e, week.start, week.end));
  const visitMap = new Map<string, number>();
  for (const e of weekly) {
    const n = normalizeMerchantName(e.merchantName) || e.merchantName;
    if (n) visitMap.set(n, (visitMap.get(n) ?? 0) + 1);
  }
  const topVisit = Array.from(visitMap.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topVisit && topVisit[1] >= 2) {
    insights.push({
      id: "weekly-visits",
      text: `Bu hafta ${topVisit[0]}'a ${topVisit[1]} kez gittin.`,
    });
  }

  const fuelEntries = expenses.filter(
    (e) => e.category === "akaryakit" && e.fuel?.pricePerLiter
  );
  const byMerchant = new Map<string, number[]>();
  for (const entry of fuelEntries) {
    const name =
      normalizeMerchantName(entry.merchantName) || entry.merchantName || "İstasyon";
    const arr = byMerchant.get(name) ?? [];
    arr.push(entry.fuel!.pricePerLiter!);
    byMerchant.set(name, arr);
  }
  const merchantAverages = Array.from(byMerchant.entries())
    .map(([name, prices]) => ({
      name,
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    }))
    .sort((a, b) => b.avg - a.avg);
  if (merchantAverages.length >= 2) {
    const priciest = merchantAverages[0];
    const cheapest = merchantAverages[merchantAverages.length - 1];
    if (priciest.name !== cheapest.name && cheapest.avg > 0) {
      const diff = Math.round(((priciest.avg - cheapest.avg) / cheapest.avg) * 100);
      if (diff >= 3) {
        insights.push({
          id: "fuel-compare",
          text: `${priciest.name}, ${cheapest.name}'dan %${diff} daha pahalı.`,
        });
      }
    }
  }

  const catTrends = getParentCategoryBreakdownWithTrend(
    expenses,
    categories,
    "month",
    now
  );
  const mover = catTrends.find(
    (c) => c.trend != null && Math.abs(c.trend) >= 15 && c.total > 0
  );
  if (mover) {
    const meta = categories.find((c) => c.id === mover.category);
    const pct = Math.round(Math.abs(mover.trend!));
    const dir = mover.trend! < 0 ? "az" : "fazla";
    insights.push({
      id: `cat-${mover.category}`,
      text: `Bu ay ${meta?.label ?? "bu kategoride"} harcaman geçen aya göre %${pct} daha ${dir}.`,
    });
  }

  const coffee = expenses.filter((e) => {
    const name = (e.merchantName ?? "").toLocaleLowerCase("tr-TR");
    return name.includes("kahve") || name.includes("coffee");
  });
  if (coffee.length >= 3) {
    const hours = coffee.map((e) => new Date(e.createdAt).getHours());
    const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
    insights.push({
      id: "coffee-time",
      text: `Genellikle saat ${String(avgHour).padStart(2, "0")}:00 civarında kahve alıyorsun.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "fallback",
      text: getInsightLine(getPeriodTotals(expenses, now)),
    });
  }

  return insights;
}

/** Deterministic daily rotation so the insight feels alive without refetching. */
export function pickDailyInsight(
  insights: SmartInsight[],
  now = new Date()
): SmartInsight | null {
  if (insights.length === 0) return null;
  const startOfYearDate = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYearDate.getTime()) / 86400000
  );
  return insights[dayOfYear % insights.length];
}

export type ProductSort = "count" | "total" | "avgPrice";

export type ProductPurchaseHit = {
  expenseId: string;
  date: string;
  merchant: string;
  price: number;
  unitPrice: number | null;
  unitLabel: string | null;
  quantity: number | null;
  unit: string | null;
};

export type ProductMerchantStat = {
  merchant: string;
  count: number;
  total: number;
  avgPrice: number;
  avgUnitPrice: number | null;
  lastDate: string;
};

export type CategoryProductStat = {
  key: string;
  name: string;
  count: number;
  totalSpent: number;
  avgPrice: number;
  avgUnitPrice: number | null;
  unitLabel: string | null;
  merchants: ProductMerchantStat[];
  mostFrequentMerchant: ProductMerchantStat | null;
  cheapestMerchant: ProductMerchantStat | null;
  insight: string | null;
  history: ProductPurchaseHit[];
};

function lineUnitInfo(item: ReceiptItem) {
  return computeUnitPrice({
    totalPrice: item.totalPrice,
    quantity: item.quantity,
    unit: item.unit,
    name: item.name,
    existingUnitPrice: item.unitPrice,
  });
}

/**
 * Per-product rollup for a category: purchase count, spend, merchant mix,
 * and a short insight when the usual store is not the cheapest.
 */
export function getCategoryProductStats(
  expenses: Expense[],
  sort: ProductSort = "count"
): CategoryProductStat[] {
  type Acc = {
    name: string;
    count: number;
    totalSpent: number;
    unitSum: number;
    unitCount: number;
    unitLabel: string | null;
    history: ProductPurchaseHit[];
    merchants: Map<
      string,
      {
        count: number;
        total: number;
        unitSum: number;
        unitCount: number;
        lastDate: string;
      }
    >;
  };

  const map = new Map<string, Acc>();

  for (const expense of expenses) {
    const merchant =
      normalizeMerchantName(expense.merchantName) ||
      expense.merchantName ||
      "Bilinmeyen";

    for (const item of expense.items ?? []) {
      const name =
        normalizeProductName(item.name) ||
        item.normalizedName ||
        item.name;
      if (!name) continue;
      const key = normalizeKey(name);
      const price = item.totalPrice ?? 0;
      if (price <= 0 && !item.name) continue;

      const unitInfo = lineUnitInfo(item);
      let acc = map.get(key);
      if (!acc) {
        acc = {
          name,
          count: 0,
          totalSpent: 0,
          unitSum: 0,
          unitCount: 0,
          unitLabel: null,
          history: [],
          merchants: new Map(),
        };
        map.set(key, acc);
      }

      acc.count += 1;
      acc.totalSpent += price;
      if (unitInfo.unitPrice != null) {
        acc.unitSum += unitInfo.unitPrice;
        acc.unitCount += 1;
        acc.unitLabel = unitInfo.unitLabel;
      }

      acc.history.push({
        expenseId: expense.id,
        date: expense.date,
        merchant,
        price,
        unitPrice: unitInfo.unitPrice,
        unitLabel: unitInfo.unitLabel,
        quantity: item.quantity ?? unitInfo.packAmount,
        unit: item.unit ?? unitInfo.packUnit,
      });

      const m = acc.merchants.get(merchant) ?? {
        count: 0,
        total: 0,
        unitSum: 0,
        unitCount: 0,
        lastDate: expense.date,
      };
      acc.merchants.set(merchant, {
        count: m.count + 1,
        total: m.total + price,
        unitSum: m.unitSum + (unitInfo.unitPrice ?? 0),
        unitCount: m.unitCount + (unitInfo.unitPrice != null ? 1 : 0),
        lastDate: expense.date > m.lastDate ? expense.date : m.lastDate,
      });
    }
  }

  const rows: CategoryProductStat[] = Array.from(map.entries()).map(
    ([key, acc]) => {
      const merchants: ProductMerchantStat[] = Array.from(
        acc.merchants.entries()
      )
        .map(([merchant, m]) => ({
          merchant,
          count: m.count,
          total: m.total,
          avgPrice: m.count > 0 ? m.total / m.count : 0,
          avgUnitPrice: m.unitCount > 0 ? m.unitSum / m.unitCount : null,
          lastDate: m.lastDate,
        }))
        .sort((a, b) => b.count - a.count);

      const mostFrequentMerchant = merchants[0] ?? null;
      const cheapestMerchant =
        [...merchants].sort((a, b) => {
          const aVal = a.avgUnitPrice ?? a.avgPrice;
          const bVal = b.avgUnitPrice ?? b.avgPrice;
          return aVal - bVal;
        })[0] ?? null;

      let insight: string | null = null;
      if (
        mostFrequentMerchant &&
        cheapestMerchant &&
        mostFrequentMerchant.merchant !== cheapestMerchant.merchant &&
        mostFrequentMerchant.count >= 2
      ) {
        const usual = mostFrequentMerchant.avgUnitPrice ?? mostFrequentMerchant.avgPrice;
        const cheap = cheapestMerchant.avgUnitPrice ?? cheapestMerchant.avgPrice;
        if (cheap > 0 && usual > cheap * 1.05) {
          const pct = Math.round(((usual - cheap) / cheap) * 100);
          insight = `Genelde ${mostFrequentMerchant.merchant}'dan alıyorsun; ${cheapestMerchant.merchant} yaklaşık %${pct} daha uygun.`;
        }
      }

      return {
        key,
        name: acc.name,
        count: acc.count,
        totalSpent: acc.totalSpent,
        avgPrice: acc.count > 0 ? acc.totalSpent / acc.count : 0,
        avgUnitPrice: acc.unitCount > 0 ? acc.unitSum / acc.unitCount : null,
        unitLabel: acc.unitLabel,
        merchants,
        mostFrequentMerchant,
        cheapestMerchant,
        insight,
        history: [...acc.history].sort((a, b) => b.date.localeCompare(a.date)),
      };
    }
  );

  rows.sort((a, b) => {
    if (sort === "total") return b.totalSpent - a.totalSpent;
    if (sort === "avgPrice") return b.avgPrice - a.avgPrice;
    return b.count - a.count || b.totalSpent - a.totalSpent;
  });

  return rows;
}

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
