import { parseISO } from "date-fns";
import { normalizeMerchantName, normalizeKey } from "@/lib/merchants";
import { computeUnitPrice, normalizeProductName } from "@/lib/products";
import { displayProductName } from "@/lib/product-name-cleaner";
import {
  formatProductDisplay,
  loadKnowledgeBase,
} from "@/lib/product-knowledge/knowledgeBase";
import { getCachedKnowledgeOverlay } from "@/lib/product-knowledge/kbStore";
import { normalizeOcrKey } from "@/lib/product-knowledge/productNormalizer";
import type { Expense, ReceiptItem, UserCategory } from "@/lib/types";
import {
  buildFuelMemoryBreakdowns,
  expenseMatchesFuelQuery,
  fuelMemoryMetrics,
  inferFuelDisplayName,
  isFuelMemoryExpense,
  isFuelMemoryQuery,
  fuelUnitPriceForExpense,
  type FuelMemoryBreakdowns,
} from "@/lib/fuel-memory";
import {
  buildTobaccoMemoryBreakdowns,
  isTobaccoItem,
  isTobaccoMemoryQuery,
  isTobaccoExpense,
  tobaccoItemMatchesQuery,
  type TobaccoMemoryBreakdowns,
} from "@/lib/tobacco-memory";
import { toPercent } from "@/lib/utils";
import {
  MATCH_ALIAS_PRODUCT,
  MATCH_CATEGORY,
  MATCH_EXACT_MERCHANT,
  MATCH_EXACT_PRODUCT,
  MATCH_NOTES,
  MATCH_OCR,
  MATCH_RANK_MERCHANT_FLOOR,
  MATCH_WORD_MERCHANT,
  MATCH_WORD_PRODUCT,
  bestFieldMatchRank,
  exactNormalizedEquals,
  normalizeSearchQuery,
  tokenizeSearchText,
  tokensCoverQuery,
  type MatchVerdict,
} from "@/lib/analytics/search-utils";

const GENERIC_TOBACCO_QUERY = /^(sigara|tutun|tütün)$/;

function isGenericTobaccoQuery(queryNormalized: string): boolean {
  return GENERIC_TOBACCO_QUERY.test(queryNormalized);
}

function spendingExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter((expense) => {
    const status = expense.parseStatus;
    return (
      status !== "processing" &&
      status !== "pending_approval" &&
      status !== "failed"
    );
  });
}

export type PurchaseRecord = {
  /** Stable dedupe key: expenseId + productKey (one row per receipt × product). */
  id: string;
  expenseId: string;
  date: string;
  productKey: string;
  productName: string;
  catalogProductId: string | null;
  normalizedName: string | null;
  rawText: string | null;
  categoryId: string | null;
  categoryGuess: string | null;
  merchant: string;
  merchantRaw: string | null;
  price: number;
  unitPrice: number | null;
  unitLabel: string | null;
  quantity: number | null;
  unit: string | null;
  currency: string;
  hasReceipt: boolean;
  isFuel: boolean;
  isTobacco: boolean;
  isMerchantVisit: boolean;
  /** Normalized searchable strings: product names + aliases. */
  searchProductFields: string[];
  /** Normalized category labels / ids. */
  searchCategoryFields: string[];
};

export type PurchaseIndex = {
  records: PurchaseRecord[];
  byProductKey: Map<string, PurchaseRecord[]>;
  byExpenseId: Map<string, PurchaseRecord[]>;
};

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
  displayName: string;
  hits: PurchaseMemoryHit[];
  last: PurchaseMemoryHit | null;
  previous: PurchaseMemoryHit[];
  first: PurchaseMemoryHit | null;
  purchaseCount: number;
  merchantCount: number;
  priceTrend: number | null;
  priceIncreasePct: number | null;
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
  averageDaysBetween: number | null;
  mostFrequentMerchant: string | null;
  mostExpensive: PurchaseMemoryHit | null;
  cheapest: PurchaseMemoryHit | null;
  stores: string[];
  fuelBreakdowns: FuelMemoryBreakdowns | null;
  tobaccoBreakdowns: TobaccoMemoryBreakdowns | null;
};

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

/** Flat insight row — one per deduped receipt × product. */
export type InsightProductPurchase = {
  key: string;
  name: string;
  expenseId: string;
  date: string;
  merchant: string;
  price: number;
  unitPrice: number | null;
  baseUnit?: "L" | "kg" | "ad" | null;
};

type AliasLookup = {
  ocrToProductId: Map<string, string>;
  productIdToAliases: Map<string, string[]>;
  productIdToDisplay: Map<string, string>;
  categoryIdToLabels: Map<string, string[]>;
};

function buildAliasLookup(categories: UserCategory[] = []): AliasLookup {
  const kb = loadKnowledgeBase([], getCachedKnowledgeOverlay());
  const ocrToProductId = new Map(kb.aliasIndex);
  const productIdToAliases = new Map<string, string[]>();
  for (const [ocr, productId] of Array.from(kb.aliasIndex.entries())) {
    const list = productIdToAliases.get(productId) ?? [];
    list.push(ocr);
    productIdToAliases.set(productId, list);
  }
  const productIdToDisplay = new Map<string, string>();
  for (const p of kb.products) {
    productIdToDisplay.set(p.id, formatProductDisplay(p));
  }
  const categoryIdToLabels = new Map<string, string[]>();
  for (const cat of categories) {
    categoryIdToLabels.set(cat.id, [
      normalizeKey(cat.label),
      normalizeKey(cat.id),
    ]);
  }
  for (const cat of kb.categories) {
    const labels = categoryIdToLabels.get(cat.id) ?? [];
    labels.push(normalizeKey(cat.name));
    categoryIdToLabels.set(cat.id, labels);
  }
  return {
    ocrToProductId,
    productIdToAliases,
    productIdToDisplay,
    categoryIdToLabels,
  };
}

function resolveCatalogProductId(
  name: string,
  item: ReceiptItem,
  lookup: AliasLookup
): string | null {
  if (item.productKey?.trim()) {
    const byKey = lookup.productIdToDisplay.has(item.productKey.trim())
      ? item.productKey.trim()
      : null;
    if (byKey) return byKey;
  }
  const ocrKey = normalizeOcrKey(name);
  return lookup.ocrToProductId.get(ocrKey) ?? null;
}

function productKeyForItem(item: ReceiptItem, name: string): string {
  if (item.productKey?.trim()) return item.productKey.trim();
  return normalizeKey(name);
}

function lineUnitInfo(item: ReceiptItem) {
  const computed = computeUnitPrice({
    totalPrice: item.totalPrice,
    quantity: item.quantity,
    unit: item.unit,
    name: item.name,
    existingUnitPrice: item.normalizedUnitPrice ?? item.unitPrice,
  });
  return {
    ...computed,
    unitPrice: item.normalizedUnitPrice ?? computed.unitPrice,
  };
}

function buildSearchProductFields(
  name: string,
  item: ReceiptItem,
  catalogProductId: string | null,
  lookup: AliasLookup
): string[] {
  const fields = new Set<string>();
  const add = (value: string | null | undefined) => {
    const n = normalizeKey(value ?? "");
    if (n) fields.add(n);
    const ocr = normalizeOcrKey(value ?? "");
    if (ocr) fields.add(ocr);
  };
  add(name);
  add(item.normalizedName);
  add(item.name);
  add(item.rawText);
  if (catalogProductId) {
    add(lookup.productIdToDisplay.get(catalogProductId));
    for (const alias of lookup.productIdToAliases.get(catalogProductId) ?? []) {
      add(alias);
    }
  }
  return Array.from(fields);
}

function buildSearchCategoryFields(
  expense: Expense,
  item: ReceiptItem,
  lookup: AliasLookup
): string[] {
  const fields = new Set<string>();
  const add = (value: string | null | undefined) => {
    const n = normalizeKey(value ?? "");
    if (n) fields.add(n);
  };
  add(expense.category);
  add(item.categoryGuess);
  for (const id of [expense.category, item.categoryGuess].filter(Boolean)) {
    for (const label of lookup.categoryIdToLabels.get(String(id)) ?? []) {
      fields.add(label);
    }
  }
  return Array.from(fields);
}

function mergeRecord(existing: PurchaseRecord, item: ReceiptItem, price: number): void {
  existing.price += price;
  if (item.quantity != null) {
    existing.quantity = (existing.quantity ?? 0) + item.quantity;
  }
}

function recordFromLine(
  expense: Expense,
  item: ReceiptItem,
  lookup: AliasLookup
): PurchaseRecord | null {
  const cleaned = displayProductName(item.normalizedName || item.name);
  const name = normalizeProductName(cleaned) || cleaned || item.name;
  if (!name?.trim()) return null;
  const price = item.totalPrice ?? 0;
  if (price <= 0 && !item.name?.trim()) return null;

  const productKey = productKeyForItem(item, name);
  const catalogProductId = resolveCatalogProductId(name, item, lookup);
  const unitInfo = lineUnitInfo(item);
  const merchant =
    normalizeMerchantName(expense.merchantName) ||
    expense.merchantName ||
    "Bilinmeyen";
  const tobacco = isTobaccoItem(item.name) || item.categoryGuess === "sigara";

  return {
    id: `${expense.id}:${productKey}`,
    expenseId: expense.id,
    date: expense.date,
    productKey,
    productName: name,
    catalogProductId,
    normalizedName: item.normalizedName,
    rawText: item.rawText,
    categoryId: item.categoryGuess ?? expense.category,
    categoryGuess: item.categoryGuess,
    merchant,
    merchantRaw: expense.merchantRaw,
    price,
    unitPrice: unitInfo.unitPrice,
    unitLabel: unitInfo.unitLabel,
    quantity: item.quantity ?? unitInfo.packAmount,
    unit: item.unit ?? unitInfo.packUnit,
    currency: expense.currency,
    hasReceipt: !!expense.imageDataUrl,
    isFuel: false,
    isTobacco: tobacco,
    isMerchantVisit: false,
    searchProductFields: buildSearchProductFields(name, item, catalogProductId, lookup),
    searchCategoryFields: buildSearchCategoryFields(expense, item, lookup),
  };
}

function recordFromFuel(expense: Expense): PurchaseRecord {
  const metrics = fuelMemoryMetrics(expense);
  const merchant =
    normalizeMerchantName(expense.merchantName) || expense.merchantName || "Bilinmeyen";
  const name = inferFuelDisplayName(expense);
  const productKey = `fuel:${normalizeKey(name)}`;

  return {
    id: `${expense.id}:${productKey}`,
    expenseId: expense.id,
    date: expense.date,
    productKey,
    productName: name,
    catalogProductId: null,
    normalizedName: null,
    rawText: expense.rawText,
    categoryId: expense.category,
    categoryGuess: expense.category,
    merchant,
    merchantRaw: expense.merchantRaw,
    price: expense.totalAmount,
    unitPrice: metrics.unitPrice,
    unitLabel: metrics.unitLabel ?? "₺/L",
    quantity: metrics.quantity,
    unit: metrics.unit ?? "LT",
    currency: expense.currency,
    hasReceipt: !!expense.imageDataUrl,
    isFuel: true,
    isTobacco: false,
    isMerchantVisit: false,
    searchProductFields: [
      normalizeKey(name),
      normalizeKey(expense.fuel?.fuelType ?? ""),
      normalizeKey(expense.subcategory ?? ""),
    ].filter(Boolean),
    searchCategoryFields: [normalizeKey(expense.category), "akaryakit"].filter(
      Boolean
    ),
  };
}

function recordFromTobaccoExpense(expense: Expense): PurchaseRecord {
  const merchant =
    normalizeMerchantName(expense.merchantName) || expense.merchantName || "Bilinmeyen";
  const productKey = "tobacco:sigara";
  const packs = expense.packCount ?? 1;
  return {
    id: `${expense.id}:${productKey}`,
    expenseId: expense.id,
    date: expense.date,
    productKey,
    productName: "Sigara",
    catalogProductId: null,
    normalizedName: null,
    rawText: expense.rawText,
    categoryId: "sigara",
    categoryGuess: "sigara",
    merchant,
    merchantRaw: expense.merchantRaw,
    price: expense.totalAmount,
    unitPrice: packs > 0 ? expense.totalAmount / packs : expense.totalAmount,
    unitLabel: "₺/paket",
    quantity: packs,
    unit: "paket",
    currency: expense.currency,
    hasReceipt: !!expense.imageDataUrl,
    isFuel: false,
    isTobacco: true,
    isMerchantVisit: false,
    searchProductFields: ["sigara", "tutun", "tütün"],
    searchCategoryFields: ["sigara"],
  };
}

function recordFromMerchantVisit(expense: Expense): PurchaseRecord {
  const merchant =
    normalizeMerchantName(expense.merchantName) ||
    expense.merchantName ||
    "Bilinmeyen";
  const productKey = `merchant:${normalizeKey(merchant)}`;
  const fuelPrice = fuelUnitPriceForExpense(expense);
  const isFuel = fuelPrice != null;

  return {
    id: `${expense.id}:${productKey}`,
    expenseId: expense.id,
    date: expense.date,
    productKey,
    productName: isFuel
      ? expense.fuel!.fuelType?.trim() || expense.merchantName || merchant
      : merchant,
    catalogProductId: null,
    normalizedName: null,
    rawText: null,
    categoryId: expense.category,
    categoryGuess: expense.category,
    merchant,
    merchantRaw: expense.merchantRaw,
    price: expense.totalAmount,
    unitPrice: fuelPrice,
    unitLabel: fuelPrice != null ? "₺/L" : null,
    quantity: isFuel ? expense.fuel!.liters : null,
    unit: isFuel ? "LT" : null,
    currency: expense.currency,
    hasReceipt: !!expense.imageDataUrl,
    isFuel,
    isTobacco: expense.category === "sigara",
    isMerchantVisit: true,
    searchProductFields: [],
    searchCategoryFields: [normalizeKey(expense.category)].filter(Boolean),
  };
}

/** Build canonical purchase index — one record per receipt × product (deduped lines). */
export function buildPurchaseIndex(
  expenses: Expense[],
  categories: UserCategory[] = []
): PurchaseIndex {
  const lookup = buildAliasLookup(categories);
  const records: PurchaseRecord[] = [];
  const byProductKey = new Map<string, PurchaseRecord[]>();
  const byExpenseId = new Map<string, PurchaseRecord[]>();

  for (const expense of spendingExpenses(expenses)) {
    const lineMap = new Map<string, PurchaseRecord>();

    if (isFuelMemoryExpense(expense)) {
      const fuelRecord = recordFromFuel(expense);
      records.push(fuelRecord);
      pushToMaps(fuelRecord, byProductKey, byExpenseId);
      continue;
    }

    for (const item of expense.items ?? []) {
      const line = recordFromLine(expense, item, lookup);
      if (!line) continue;
      const existing = lineMap.get(line.productKey);
      if (existing) {
        mergeRecord(existing, item, item.totalPrice ?? 0);
      } else {
        lineMap.set(line.productKey, line);
      }
    }

    for (const line of Array.from(lineMap.values())) {
      records.push(line);
      pushToMaps(line, byProductKey, byExpenseId);
    }

    if (
      expense.items.length === 0 &&
      expense.category === "sigara" &&
      !lineMap.has("tobacco:sigara")
    ) {
      const tobacco = recordFromTobaccoExpense(expense);
      records.push(tobacco);
      pushToMaps(tobacco, byProductKey, byExpenseId);
    }
  }

  return { records, byProductKey, byExpenseId };
}

function pushToMaps(
  record: PurchaseRecord,
  byProductKey: Map<string, PurchaseRecord[]>,
  byExpenseId: Map<string, PurchaseRecord[]>
): void {
  const pk = byProductKey.get(record.productKey) ?? [];
  pk.push(record);
  byProductKey.set(record.productKey, pk);
  const ex = byExpenseId.get(record.expenseId) ?? [];
  ex.push(record);
  byExpenseId.set(record.expenseId, ex);
}

function toInsightBaseUnit(
  unit: string | null
): InsightProductPurchase["baseUnit"] {
  if (unit === "LT" || unit === "L") return "L";
  if (unit === "kg") return "kg";
  if (unit === "ad") return "ad";
  return null;
}

export function indexToInsightPurchases(
  index: PurchaseIndex
): InsightProductPurchase[] {
  return index.records
    .filter((r) => !r.isMerchantVisit)
    .map((r) => ({
      key: r.productKey,
      name: r.productName,
      expenseId: r.expenseId,
      date: r.date,
      merchant: r.merchant,
      price: r.price,
      unitPrice: r.unitPrice,
      baseUnit: toInsightBaseUnit(r.unit),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function recordMatchRank(
  record: PurchaseRecord,
  queryTokens: string[],
  queryNormalized: string
): MatchVerdict | null {
  if (record.isMerchantVisit) return null;

  const productVerdict = bestFieldMatchRank(
    record.searchProductFields,
    queryTokens,
    queryNormalized,
    { exact: MATCH_EXACT_PRODUCT, word: MATCH_WORD_PRODUCT }
  );
  if (productVerdict?.rank === MATCH_EXACT_PRODUCT) return productVerdict;

  const aliasFields = record.searchProductFields.filter(
    (f) => f !== normalizeKey(record.productName)
  );
  const aliasVerdict = bestFieldMatchRank(aliasFields, queryTokens, queryNormalized, {
    exact: MATCH_ALIAS_PRODUCT,
    word: MATCH_ALIAS_PRODUCT,
  });
  if (aliasVerdict) {
    const best = productVerdict &&
      productVerdict.rank <= MATCH_WORD_PRODUCT &&
      productVerdict.specificity >= aliasVerdict.specificity
      ? productVerdict
      : aliasVerdict;
    if (best.rank <= MATCH_WORD_PRODUCT) return best;
  }

  const categoryVerdict = bestFieldMatchRank(
    record.searchCategoryFields,
    queryTokens,
    queryNormalized,
    { exact: MATCH_CATEGORY, word: MATCH_CATEGORY }
  );
  if (categoryVerdict) {
    if (productVerdict && productVerdict.rank <= MATCH_WORD_PRODUCT) {
      return productVerdict;
    }
    return categoryVerdict;
  }

  if (productVerdict) return productVerdict;

  if (tokensCoverQuery(tokenizeSearchText(record.rawText), queryTokens)) {
    return { rank: MATCH_OCR, specificity: 0 };
  }

  return null;
}

function merchantMatchRank(
  expense: Expense,
  queryTokens: string[],
  queryNormalized: string
): MatchVerdict | null {
  const merchantFields = [expense.merchantName, expense.merchantRaw].filter(
    Boolean
  ) as string[];
  const fuelFields = [
    expense.fuel?.stationName,
    expense.fuel?.fuelType,
    expense.subcategory,
  ].filter(Boolean) as string[];

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
  for (const field of fuelFields) {
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

function recordToHit(record: PurchaseRecord): PurchaseMemoryHit {
  return {
    itemName: record.productName,
    normalizedName: record.normalizedName,
    rawText: record.rawText,
    expenseId: record.expenseId,
    date: record.date,
    store: record.merchant,
    price: record.price,
    unitPrice: record.unitPrice,
    unitLabel: record.unitLabel,
    quantity: record.quantity,
    unit: record.unit,
    currency: record.currency,
    hasReceipt: record.hasReceipt,
  };
}

function effectivePrice(hit: PurchaseMemoryHit): number | null {
  if (hit.unitLabel === "₺/L") return hit.unitPrice ?? null;
  return hit.unitPrice ?? hit.price;
}

const MAX_PRICE_TREND_PCT = 500;

function arePricesComparable(a: PurchaseMemoryHit, b: PurchaseMemoryHit): boolean {
  const labelA = a.unitLabel ?? null;
  const labelB = b.unitLabel ?? null;
  if (labelA || labelB) return labelA === labelB;
  return true;
}

function resolvePriceTrend(hits: PurchaseMemoryHit[]): {
  priceChangePct: number | null;
  previousComparablePrice: number | null;
  latestComparablePrice: number | null;
} {
  for (let i = 0; i < hits.length - 1; i++) {
    const latest = hits[i]!;
    const previous = hits[i + 1]!;
    const latestPrice = effectivePrice(latest);
    const previousPrice = effectivePrice(previous);
    if (latestPrice == null || previousPrice == null) continue;
    if (!arePricesComparable(latest, previous)) continue;
    const pct = toPercent(latestPrice, previousPrice);
    if (pct == null) continue;
    if (Math.abs(pct) > MAX_PRICE_TREND_PCT) {
      return {
        priceChangePct: null,
        previousComparablePrice: null,
        latestComparablePrice: null,
      };
    }
    return {
      priceChangePct: pct,
      previousComparablePrice: previousPrice,
      latestComparablePrice: latestPrice,
    };
  }
  return {
    priceChangePct: null,
    previousComparablePrice: null,
    latestComparablePrice: null,
  };
}

function modeLabel(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return (
    Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  );
}

type RankedHit = PurchaseMemoryHit & {
  matchRank: number;
  matchSpecificity: number;
};

function assembleMemoryResult(
  query: string,
  rankedHits: RankedHit[],
  expenses: Expense[],
  options: {
    fuelQuery: boolean;
    tobaccoQuery: boolean;
  }
): PurchaseMemoryResult {
  rankedHits.sort((a, b) => b.date.localeCompare(a.date));
  const hits = rankedHits.map((entry) => {
    const { matchRank, matchSpecificity, ...hit } = entry;
    void matchRank;
    void matchSpecificity;
    return hit;
  });

  const last = hits[0] ?? null;
  const previous = hits.slice(1);
  const first = hits.length ? hits[hits.length - 1]! : null;

  const priced = hits
    .map((h) => ({ hit: h, value: effectivePrice(h) }))
    .filter((x): x is { hit: PurchaseMemoryHit; value: number } => x.value != null);

  const trend = resolvePriceTrend(hits);
  const priceChangePct = trend.priceChangePct;
  const previousComparablePrice = trend.previousComparablePrice;
  const latestComparablePrice = trend.latestComparablePrice;

  const values = priced.map((p) => p.value);
  const unitValues = hits
    .map((h) => h.unitPrice)
    .filter((v): v is number => v != null && v > 0);

  const stores = Array.from(
    new Set(hits.map((h) => h.store).filter(Boolean) as string[])
  );

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

  const storeVisits = hits.map((h) => h.store).filter((s): s is string => !!s);
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
    last?.unitLabel || hits.find((h) => h.unitLabel)?.unitLabel || null;

  const bestRank = rankedHits.reduce(
    (min, h) => Math.min(min, h.matchRank),
    Number.POSITIVE_INFINITY
  );

  const productHits = rankedHits.filter((h) => h.matchRank < MATCH_RANK_MERCHANT_FLOOR);
  const purchaseCount =
    productHits.length > 0
      ? productHits.length
      : rankedHits.length;

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
    query;

  const rows = spendingExpenses(expenses);
  const hitExpenseIds = new Set(hits.map((h) => h.expenseId));
  const fuelBreakdowns =
    options.fuelQuery && hitExpenseIds.size > 0
      ? buildFuelMemoryBreakdowns(rows.filter((e) => hitExpenseIds.has(e.id)))
      : null;

  const tobaccoBreakdowns =
    options.tobaccoQuery && hitExpenseIds.size > 0
      ? buildTobaccoMemoryBreakdowns(
          rows.filter((e) => hitExpenseIds.has(e.id))
        )
      : null;

  return {
    query,
    displayName,
    hits,
    last,
    previous,
    first,
    purchaseCount,
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
    fuelBreakdowns,
    tobaccoBreakdowns,
  };
}

export function searchPurchaseIndex(
  index: PurchaseIndex,
  expenses: Expense[],
  query: string
): PurchaseMemoryResult | null {
  const parsed = normalizeSearchQuery(query);
  if (!parsed) return null;
  const { trimmed, normalized, tokens } = parsed;

  const rows = spendingExpenses(expenses);
  const expenseById = new Map(rows.map((e) => [e.id, e]));
  const rankedHits: RankedHit[] = [];

  if (isFuelMemoryQuery(trimmed)) {
    for (const expense of rows.filter(isFuelMemoryExpense)) {
      if (!expenseMatchesFuelQuery(expense, normalized, tokens)) continue;
      const record = index.records.find(
        (r) => r.expenseId === expense.id && r.isFuel
      );
      if (!record) continue;
      rankedHits.push({
        ...recordToHit(record),
        matchRank: MATCH_EXACT_PRODUCT,
        matchSpecificity: 100,
      });
    }
    return assembleMemoryResult(trimmed, rankedHits, expenses, {
      fuelQuery: true,
      tobaccoQuery: false,
    });
  }

  if (isTobaccoMemoryQuery(trimmed)) {
    for (const record of index.records) {
      if (!record.isTobacco) continue;
      const expense = expenseById.get(record.expenseId);
      if (!expense || !isTobaccoExpense(expense)) continue;
      if (
        !isGenericTobaccoQuery(normalized) &&
        !tobaccoItemMatchesQuery(record, normalized, tokens)
      ) {
        continue;
      }
      rankedHits.push({
        ...recordToHit(record),
        matchRank: MATCH_EXACT_PRODUCT,
        matchSpecificity: 100,
      });
    }
    return assembleMemoryResult(trimmed, rankedHits, expenses, {
      fuelQuery: false,
      tobaccoQuery: true,
    });
  }

  const merchantMatchedExpenses: Expense[] = [];
  for (const expense of rows) {
    const verdict = merchantMatchRank(expense, tokens, normalized);
    if (
      verdict &&
      (verdict.rank === MATCH_EXACT_MERCHANT ||
        verdict.rank === MATCH_WORD_MERCHANT)
    ) {
      merchantMatchedExpenses.push(expense);
    }
  }

  if (merchantMatchedExpenses.length > 0) {
    for (const expense of merchantMatchedExpenses) {
      const verdict = merchantMatchRank(expense, tokens, normalized)!;
      const visit = recordFromMerchantVisit(expense);
      rankedHits.push({
        ...recordToHit(visit),
        matchRank: verdict.rank,
        matchSpecificity: verdict.specificity,
      });
    }
    return assembleMemoryResult(trimmed, rankedHits, expenses, {
      fuelQuery: false,
      tobaccoQuery: false,
    });
  }

  for (const record of index.records) {
    if (record.isMerchantVisit) continue;
    const verdict = recordMatchRank(record, tokens, normalized);
    if (verdict == null) continue;
    rankedHits.push({
      ...recordToHit(record),
      matchRank: verdict.rank,
      matchSpecificity: verdict.specificity,
    });
  }

  for (const expense of rows) {
    const verdict = merchantMatchRank(expense, tokens, normalized);
    if (verdict == null) continue;
    if (
      verdict.rank === MATCH_EXACT_MERCHANT ||
      verdict.rank === MATCH_WORD_MERCHANT
    ) {
      continue;
    }
    const visit = recordFromMerchantVisit(expense);
    rankedHits.push({
      ...recordToHit(visit),
      matchRank: verdict.rank,
      matchSpecificity: verdict.specificity,
    });
  }

  return assembleMemoryResult(trimmed, rankedHits, expenses, {
    fuelQuery: false,
    tobaccoQuery: false,
  });
}

export function searchPurchaseMemory(
  expenses: Expense[],
  query: string,
  categories: UserCategory[] = []
): PurchaseMemoryResult | null {
  const index = buildPurchaseIndex(expenses, categories);
  return searchPurchaseIndex(index, expenses, query);
}

export function getCategoryProductStatsFromIndex(
  index: PurchaseIndex,
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

  for (const record of index.records) {
    if (record.isMerchantVisit) continue;
    let acc = map.get(record.productKey);
    if (!acc) {
      acc = {
        name: record.productName,
        count: 0,
        totalSpent: 0,
        unitSum: 0,
        unitCount: 0,
        unitLabel: null,
        history: [],
        merchants: new Map(),
      };
      map.set(record.productKey, acc);
    }

    acc.count += 1;
    acc.totalSpent += record.price;
    if (record.unitPrice != null) {
      acc.unitSum += record.unitPrice;
      acc.unitCount += 1;
      acc.unitLabel = record.unitLabel;
    }

    acc.history.push({
      expenseId: record.expenseId,
      date: record.date,
      merchant: record.merchant,
      price: record.price,
      unitPrice: record.unitPrice,
      unitLabel: record.unitLabel,
      quantity: record.quantity,
      unit: record.unit,
    });

    const m = acc.merchants.get(record.merchant) ?? {
      count: 0,
      total: 0,
      unitSum: 0,
      unitCount: 0,
      lastDate: record.date,
    };
    acc.merchants.set(record.merchant, {
      count: m.count + 1,
      total: m.total + record.price,
      unitSum: m.unitSum + (record.unitPrice ?? 0),
      unitCount: m.unitCount + (record.unitPrice != null ? 1 : 0),
      lastDate: record.date > m.lastDate ? record.date : m.lastDate,
    });
  }

  const rows: CategoryProductStat[] = Array.from(map.entries()).map(
    ([key, acc]) => {
      const merchants: ProductMerchantStat[] = Array.from(acc.merchants.entries())
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
        const usual =
          mostFrequentMerchant.avgUnitPrice ?? mostFrequentMerchant.avgPrice;
        const cheap =
          cheapestMerchant.avgUnitPrice ?? cheapestMerchant.avgPrice;
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

export function getCategoryProductStats(
  expenses: Expense[],
  sort: ProductSort = "count",
  categories: UserCategory[] = []
): CategoryProductStat[] {
  return getCategoryProductStatsFromIndex(buildPurchaseIndex(expenses, categories), sort);
}

export function productFrequency(
  index: PurchaseIndex,
  productKey: string
): number {
  return (index.byProductKey.get(productKey) ?? []).length;
}

export function rebuildIndexProducesSameStats(
  expenses: Expense[],
  categories: UserCategory[] = []
): boolean {
  const a = buildPurchaseIndex(expenses, categories);
  const b = buildPurchaseIndex(expenses, categories);
  if (a.records.length !== b.records.length) return false;
  const statsA = getCategoryProductStatsFromIndex(a);
  const statsB = getCategoryProductStatsFromIndex(b);
  if (statsA.length !== statsB.length) return false;
  for (let i = 0; i < statsA.length; i++) {
    if (statsA[i]!.key !== statsB[i]!.key) return false;
    if (statsA[i]!.count !== statsB[i]!.count) return false;
  }
  return true;
}
