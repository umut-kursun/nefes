import { normalizeKey } from "@/lib/merchants";
import type { Expense } from "@/lib/types";

/** Valid refuel: akaryakıt category with measurable liters and ₺/L. */
export function isValidFuelExpense(expense: Expense): boolean {
  if (expense.category !== "akaryakit") return false;
  const liters = expense.fuel?.liters;
  const pricePerLiter = expense.fuel?.pricePerLiter;
  return (
    liters != null &&
    liters > 0 &&
    pricePerLiter != null &&
    pricePerLiter > 0 &&
    pricePerLiter < 500
  );
}

/** Product-line / receipt text keywords that identify a fuel purchase. */
const FUEL_PRODUCT_KEYWORDS =
  /(?:benzin|motorin|lpg|vimax|vpro|dizel|diesel|mazot)/i;

const FUEL_QUERY =
  /\b(akaryak[iı]t|motorin|benzin|lpg|dizel|diesel|mazot|yak[iı]t|fuel|vimax|vpro)\b/i;

/** True when any line item or receipt text mentions a fuel product keyword. */
export function hasFuelProductKeywords(expense: Expense): boolean {
  const blobs = [
    ...expense.items.map((i) => i.name),
    ...expense.items.map((i) => i.rawText).filter(Boolean),
    expense.rawText,
    expense.subcategory,
    expense.notes,
  ].filter(Boolean) as string[];

  return blobs.some((text) => FUEL_PRODUCT_KEYWORDS.test(text));
}

/**
 * Fuel Memory inclusion — OCR fuelDetails, manual akaryakıt category, or fuel keywords.
 * Does not require liters / plate / ₺/L.
 */
export function isFuelMemoryExpense(expense: Expense): boolean {
  if (isValidFuelExpense(expense)) return true;
  if (expense.category === "akaryakit") return true;
  return hasFuelProductKeywords(expense);
}

/** Best-effort fuel type label for memory UI when fuelDetails is partial or missing. */
export function inferFuelDisplayName(expense: Expense): string {
  const fromFuel = expense.fuel?.fuelType?.trim();
  if (fromFuel) return fromFuel;

  const fromSub = expense.subcategory?.trim();
  if (fromSub && FUEL_PRODUCT_KEYWORDS.test(fromSub)) {
    return normalizeFuelTypeKey(fromSub);
  }

  for (const item of expense.items) {
    const name = item.name.trim();
    if (!name || !FUEL_PRODUCT_KEYWORDS.test(name)) continue;
    const lower = name.toLocaleLowerCase("tr-TR");
    if (/vimax|vpro|motorin|dizel|diesel|mazot/.test(lower)) return "Motorin";
    if (/benzin/.test(lower)) return "Benzin";
    if (/lpg/.test(lower)) return "LPG";
    return name;
  }

  if (expense.category === "akaryakit") return "Akaryakıt";
  return "Akaryakıt";
}

export function fuelMemoryMetrics(expense: Expense): {
  readonly unitPrice: number | null;
  readonly unitLabel: string | null;
  readonly quantity: number | null;
  readonly unit: string | null;
} {
  const liters =
    expense.fuel?.liters != null && expense.fuel.liters > 0
      ? expense.fuel.liters
      : null;
  const pricePerLiter =
    expense.fuel?.pricePerLiter != null &&
    expense.fuel.pricePerLiter > 0 &&
    expense.fuel.pricePerLiter < 500
      ? expense.fuel.pricePerLiter
      : null;

  if (pricePerLiter != null && liters != null) {
    return {
      unitPrice: pricePerLiter,
      unitLabel: "₺/L",
      quantity: liters,
      unit: "LT",
    };
  }

  return {
    unitPrice: pricePerLiter,
    unitLabel: pricePerLiter != null ? "₺/L" : null,
    quantity: liters,
    unit: liters != null ? "LT" : null,
  };
}

function foldForCity(value: string): string {
  return value
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I")
    .replace(/ı/g, "I");
}

export function isFuelMemoryQuery(query: string): boolean {
  return FUEL_QUERY.test(query.trim());
}

export function fuelUnitPriceForExpense(expense: Expense): number | null {
  if (!isValidFuelExpense(expense)) return null;
  return expense.fuel!.pricePerLiter!;
}

const CITY_LABELS: Record<string, string> = {
  ISTANBUL: "İstanbul",
  ANKARA: "Ankara",
  IZMIR: "İzmir",
  BURSA: "Bursa",
  ANTALYA: "Antalya",
  ADANA: "Adana",
  KONYA: "Konya",
  GAZIANTEP: "Gaziantep",
  KOCAELI: "Kocaeli",
  MERSIN: "Mersin",
  DIYARBAKIR: "Diyarbakır",
  KAYSERI: "Kayseri",
  ESKISEHIR: "Eskişehir",
  SAMSUN: "Samsun",
  DENIZLI: "Denizli",
  SANLIURFA: "Şanlıurfa",
  MUGLA: "Muğla",
  TEKIRDAG: "Tekirdağ",
  TRABZON: "Trabzon",
  SAKARYA: "Sakarya",
  BUYUKCEKMECE: "Büyükçekmece",
};

/** Best-effort city from receipt text / merchant (e.g. "BÜYÜKÇEKMECE / İSTANBUL"). */
export function extractFuelCity(expense: Expense): string | null {
  const blob = [
    expense.rawText,
    expense.merchantRaw,
    expense.notes,
    expense.merchantName,
    expense.fuel?.stationName,
  ]
    .filter(Boolean)
    .join("\n");

  if (!blob.trim()) return null;
  const folded = foldForCity(blob);

  const slashMatch = folded.match(/\/\s*([A-Z]{3,})\b/);
  if (slashMatch?.[1]) {
    const label = CITY_LABELS[slashMatch[1]];
    if (label) return label;
  }

  for (const [key, label] of Object.entries(CITY_LABELS)) {
    if (folded.includes(key)) return label;
  }

  return null;
}

export function normalizeFuelTypeKey(
  fuelType: string | null | undefined
): "Motorin" | "Benzin" | "LPG" | "Diğer" {
  const t = (fuelType ?? "").toLocaleLowerCase("tr-TR");
  if (/motorin|dizel|diesel|mazot/.test(t)) return "Motorin";
  if (/benzin/.test(t)) return "Benzin";
  if (/lpg/.test(t)) return "LPG";
  return "Diğer";
}

export type FuelBreakdownRow = {
  readonly key: string;
  readonly label: string;
  readonly fillUps: number;
  readonly totalLiters: number;
  readonly totalSpend: number;
  readonly avgPricePerLiter: number;
};

export type FuelMemoryBreakdowns = {
  readonly byPlate: readonly FuelBreakdownRow[];
  readonly byFuelType: readonly FuelBreakdownRow[];
  readonly byCity: readonly FuelBreakdownRow[];
};

function aggregateFuelRows(
  expenses: readonly Expense[],
  keyFn: (e: Expense) => string,
  labelFn: (key: string, e: Expense) => string
): FuelBreakdownRow[] {
  const map = new Map<
    string,
    { label: string; liters: number; spend: number; prices: number[]; count: number }
  >();

  for (const expense of expenses) {
    if (!isFuelMemoryExpense(expense)) continue;
    const key = keyFn(expense);
    const label = labelFn(key, expense);
    const cur = map.get(key) ?? {
      label,
      liters: 0,
      spend: 0,
      prices: [],
      count: 0,
    };
    const liters = expense.fuel?.liters;
    const pricePerLiter = expense.fuel?.pricePerLiter;
    if (liters != null && liters > 0) cur.liters += liters;
    if (
      pricePerLiter != null &&
      pricePerLiter > 0 &&
      pricePerLiter < 500
    ) {
      cur.prices.push(pricePerLiter);
    }
    cur.spend += expense.totalAmount || 0;
    cur.count += 1;
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .map(([key, data]) => ({
      key,
      label: data.label,
      fillUps: data.count,
      totalLiters: Math.round(data.liters * 1000) / 1000,
      totalSpend: Math.round(data.spend * 100) / 100,
      avgPricePerLiter:
        data.prices.length > 0
          ? Math.round(
              (data.prices.reduce((a, b) => a + b, 0) / data.prices.length) * 100
            ) / 100
          : 0,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);
}

export function inferFuelTypeKey(expense: Expense): string {
  const fromFuel = expense.fuel?.fuelType?.trim();
  if (fromFuel) return normalizeFuelTypeKey(fromFuel);
  return normalizeFuelTypeKey(inferFuelDisplayName(expense));
}

export function buildFuelMemoryBreakdowns(
  expenses: readonly Expense[]
): FuelMemoryBreakdowns {
  const fuelRows = expenses.filter(isFuelMemoryExpense);

  return {
    byPlate: aggregateFuelRows(
      fuelRows,
      (e) => normalizeKey(e.fuel?.plate?.trim() || "—"),
      (_key, e) => e.fuel?.plate?.trim() || "—"
    ),
    byFuelType: aggregateFuelRows(
      fuelRows,
      (e) => inferFuelTypeKey(e),
      (key) => key
    ),
    byCity: aggregateFuelRows(
      fuelRows,
      (e) => normalizeKey(extractFuelCity(e) || "Bilinmeyen"),
      (_key, e) => extractFuelCity(e) || "Bilinmeyen"
    ),
  };
}

export function expenseMatchesFuelQuery(
  expense: Expense,
  queryNormalized: string,
  queryTokens: string[]
): boolean {
  if (!isFuelMemoryExpense(expense)) return false;

  const fields = [
    expense.fuel?.fuelType,
    expense.fuel?.stationName,
    expense.fuel?.plate,
    expense.subcategory,
    expense.merchantName,
    expense.merchantRaw,
    inferFuelDisplayName(expense),
    ...expense.items.map((i) => i.name),
    "akaryakit",
    "akaryakıt",
  ]
    .filter(Boolean)
    .map((f) => normalizeKey(String(f)));

  if (fields.some((f) => f === queryNormalized)) return true;

  return queryTokens.every((qt) =>
    fields.some((f) => f.includes(normalizeKey(qt)) || normalizeKey(qt).includes(f))
  );
}
