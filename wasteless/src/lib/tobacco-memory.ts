import { normalizeKey, normalizeMerchantName } from "@/lib/merchants";
import type { Expense } from "@/lib/types";

const TOBACCO_QUERY =
  /\b(sigara|marlboro|tütün|tutun|camel|winston|parliament|tekel|ld\s|l[\s&]?m)\b/i;

const TOBACCO_ITEM =
  /\b(sigara|marlboro|camel|winston|parliament|tekel|tütün|tutun|ld|l[\s&]?m|chesterfield|pall\s*mall|kent|muratti)\b/i;

export function isTobaccoMemoryQuery(query: string): boolean {
  return TOBACCO_QUERY.test(query.trim());
}

function isTobaccoItem(name: string): boolean {
  return TOBACCO_ITEM.test(name);
}

export { isTobaccoItem };

function inferPackCount(expense: Expense): number {
  if (expense.packCount != null && expense.packCount > 0) {
    return expense.packCount;
  }
  const fromItems = expense.items
    .filter((i) => isTobaccoItem(i.name))
    .reduce((sum, i) => sum + Math.max(i.quantity ?? 1, 1), 0);
  if (fromItems > 0) return fromItems;
  return 1;
}

function merchantBucket(name: string | null | undefined): string {
  const normalized = normalizeKey(normalizeMerchantName(name ?? "") || name || "");
  if (/migros/.test(normalized)) return "Migros";
  if (/tekel|tekel\s*bay/i.test(normalized)) return "Tekel";
  if (/file|bim|a101|carrefour|sok/.test(normalized)) {
    return normalizeMerchantName(name ?? "") || "Market";
  }
  return normalizeMerchantName(name ?? "") || "Diğer";
}

export type TobaccoMerchantRow = {
  readonly key: string;
  readonly label: string;
  readonly packs: number;
  readonly totalSpend: number;
  readonly avgPricePerPack: number;
};

export type TobaccoMemoryBreakdowns = {
  readonly totalPacks: number;
  readonly avgPricePerPack: number;
  readonly byMerchant: readonly TobaccoMerchantRow[];
};

export function buildTobaccoMemoryBreakdowns(
  expenses: readonly Expense[]
): TobaccoMemoryBreakdowns {
  const map = new Map<
    string,
    { label: string; packs: number; spend: number; prices: number[] }
  >();

  let totalPacks = 0;
  let totalSpend = 0;

  for (const expense of expenses) {
    const tobaccoItems = expense.items.filter((i) => isTobaccoItem(i.name));
    const isTobaccoExpense =
      tobaccoItems.length > 0 ||
      expense.category === "sigara" ||
      TOBACCO_ITEM.test(expense.notes ?? "");

    if (!isTobaccoExpense) continue;

    const packs =
      tobaccoItems.length > 0
        ? tobaccoItems.reduce((sum, i) => sum + Math.max(i.quantity ?? 1, 1), 0)
        : inferPackCount(expense);
    const spend =
      tobaccoItems.length > 0
        ? tobaccoItems.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0)
        : expense.totalAmount || 0;

    if (packs <= 0 || spend <= 0) continue;

    const bucket = merchantBucket(expense.merchantName);
    const key = normalizeKey(bucket);
    const cur = map.get(key) ?? { label: bucket, packs: 0, spend: 0, prices: [] };
    cur.packs += packs;
    cur.spend += spend;
    cur.prices.push(spend / packs);
    map.set(key, cur);

    totalPacks += packs;
    totalSpend += spend;
  }

  const byMerchant = Array.from(map.entries())
    .map(([key, data]) => ({
      key,
      label: data.label,
      packs: data.packs,
      totalSpend: Math.round(data.spend * 100) / 100,
      avgPricePerPack:
        data.packs > 0
          ? Math.round((data.spend / data.packs) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  return {
    totalPacks,
    avgPricePerPack:
      totalPacks > 0
        ? Math.round((totalSpend / totalPacks) * 100) / 100
        : 0,
    byMerchant,
  };
}

export function expenseMatchesTobaccoQuery(
  expense: Expense,
  queryNormalized: string,
  queryTokens: string[]
): boolean {
  const fields = [
    expense.merchantName,
    expense.merchantRaw,
    expense.notes,
    ...expense.items.map((i) => i.name),
    ...expense.items.map((i) => i.normalizedName ?? ""),
    "sigara",
    "tütün",
  ]
    .filter(Boolean)
    .map((f) => normalizeKey(String(f)));

  if (fields.some((f) => f.includes(queryNormalized))) return true;

  return queryTokens.every((qt) =>
    fields.some((f) => f.includes(normalizeKey(qt)))
  );
}
