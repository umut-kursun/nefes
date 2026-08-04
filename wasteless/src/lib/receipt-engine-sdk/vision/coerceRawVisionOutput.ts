const MERCHANT_CATEGORIES = new Set([
  "RESTAURANT",
  "MARKET",
  "FUEL",
  "PHARMACY",
  "RETAIL",
  "OTHER",
]);

const PAYMENT_TYPES = new Set(["CREDIT_CARD", "CASH", "OTHER"]);

const VAT_RATES = new Set([1, 8, 10, 18, 20]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toNonNegative(value: unknown, fallback = 0): number {
  const n = toNumber(value);
  if (n == null) return fallback;
  return n < 0 ? Math.abs(n) : n;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function coerceVatRate(value: unknown): 1 | 8 | 10 | 18 | 20 | null | undefined {
  if (value == null) return undefined;
  const n = toNumber(value);
  if (n != null && VAT_RATES.has(n as 1 | 8 | 10 | 18 | 20)) {
    return n as 1 | 8 | 10 | 18 | 20;
  }
  return null;
}

function coerceQuantity(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const n = toNumber(value);
  if (n != null && n > 0) return n;
  return null;
}

function coerceProduct(raw: unknown, index: number): Record<string, unknown> {
  const p = asRecord(raw) ?? {};
  const name =
    typeof p.name === "string" && p.name.trim()
      ? p.name.trim()
      : `Okunamayan kalem ${index + 1}`;
  const lineTotal = toNonNegative(p.lineTotal, 0);
  const quantity = coerceQuantity(p.quantity);

  const out: Record<string, unknown> = {
    name,
    lineTotal,
  };

  if (quantity !== undefined) {
    out.quantity = quantity;
  }

  if (p.unit != null) out.unit = p.unit;
  const unitPrice = toNumber(p.unitPrice);
  if (unitPrice != null && unitPrice >= 0) out.unitPrice = unitPrice;

  const vat = coerceVatRate(p.vatRatePercentage);
  if (vat !== undefined) out.vatRatePercentage = vat;

  return out;
}

/**
 * Generously normalizes raw Vision LLM JSON before strict Zod validation.
 * Fills confidence, merchant/metadata shells, and coerces numeric/string gaps.
 */
export function coerceRawVisionOutput(raw: unknown): unknown {
  const root = asRecord(raw);
  if (!root) return raw;

  const out: Record<string, unknown> = { ...root };
  out.confidence =
    typeof out.confidence === "number" &&
    out.confidence >= 0 &&
    out.confidence <= 1
      ? out.confidence
      : 0.9;

  const merchant = asRecord(out.merchant) ?? {};
  out.merchant = {
    ...merchant,
    title:
      typeof merchant.title === "string" && merchant.title.trim()
        ? merchant.title.trim()
        : "Bilinmeyen işyeri",
    category: MERCHANT_CATEGORIES.has(String(merchant.category))
      ? merchant.category
      : "OTHER",
  };

  const metadata = asRecord(out.metadata) ?? {};
  const purchaseDate =
    typeof metadata.purchaseDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(metadata.purchaseDate)
      ? metadata.purchaseDate
      : todayIsoDate();
  out.metadata = {
    ...metadata,
    purchaseDate,
    currency:
      typeof metadata.currency === "string" && metadata.currency.trim()
        ? metadata.currency
        : "TRY",
  };

  const productsRaw = Array.isArray(out.products) ? out.products : [];
  let products = productsRaw.map((item, index) => coerceProduct(item, index));

  const financials = asRecord(out.financials) ?? {};
  let totalAmount = toNonNegative(financials.totalAmount, 0);
  if (totalAmount === 0 && products.length > 0) {
    totalAmount = products.reduce(
      (sum, p) => sum + toNonNegative(p.lineTotal, 0),
      0
    );
  }
  out.financials = {
    ...financials,
    totalAmount,
  };

  if (products.length === 0) {
    products = [
      {
        name: "Okunamayan kalem",
        lineTotal: totalAmount > 0 ? totalAmount : 0.01,
      },
    ];
  }
  out.products = products;

  const discountsRaw = Array.isArray(out.discounts) ? out.discounts : [];
  out.discounts = discountsRaw
    .map((d) => {
      const disc = asRecord(d);
      if (!disc) return null;
      const name =
        typeof disc.name === "string" && disc.name.trim()
          ? disc.name.trim()
          : "İndirim";
      const amountRaw = toNumber(disc.amount);
      if (amountRaw == null || amountRaw === 0) return null;
      const amount = amountRaw < 0 ? amountRaw : -Math.abs(amountRaw);
      const vat = coerceVatRate(disc.vatRatePercentage);
      return {
        ...disc,
        name,
        amount,
        ...(vat !== undefined ? { vatRatePercentage: vat } : {}),
      };
    })
    .filter(Boolean);

  const paymentsRaw = Array.isArray(out.payments) ? out.payments : [];
  out.payments = paymentsRaw
    .map((p) => {
      const pay = asRecord(p);
      if (!pay) return null;
      const type = PAYMENT_TYPES.has(String(pay.type))
        ? pay.type
        : "OTHER";
      return {
        ...pay,
        type,
        amount: toNonNegative(pay.amount, 0),
      };
    })
    .filter(Boolean);

  if (typeof out.rawText !== "string") {
    out.rawText = "";
  }

  return out;
}
