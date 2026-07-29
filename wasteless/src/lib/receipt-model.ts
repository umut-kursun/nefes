/** Typed receipt charge categories (bag, shipping, etc.). */
export enum ChargeType {
  Bag = "bag",
  Shipping = "shipping",
  Service = "service",
  Packaging = "packaging",
  Other = "other",
}

/** Typed discount categories. */
export enum DiscountType {
  Coupon = "coupon",
  Campaign = "campaign",
  Loyalty = "loyalty",
  Other = "other",
}

/** Typed payment method categories. */
export enum PaymentType {
  Cash = "cash",
  Card = "card",
  Contactless = "contactless",
  Mixed = "mixed",
  Other = "other",
}

/** Receipt-level fee (poşet, kargo, etc.) — not a product. */
export type ChargeLine = {
  type: ChargeType;
  label: string;
  amount: number;
};

/** Receipt-level discount — not a product. */
export type DiscountLine = {
  type: DiscountType;
  label: string;
  amount: number;
};

/** Payment footer line — not a product, not in total calculation. */
export type PaymentLine = {
  type: PaymentType;
  label: string;
  amount: number | null;
};

/** Unclassified non-product line preserved for review. */
export type UnknownLine = {
  label: string;
  amount: number | null;
  reason: string;
  raw?: string;
};

/** @deprecated Use ChargeLine */
export type ReceiptChargeLine = ChargeLine;

/** @deprecated Use ChargeType */
export type ReceiptChargeType = ChargeType;

const CHARGE_TYPE_VALUES = new Set<string>(Object.values(ChargeType));
const DISCOUNT_TYPE_VALUES = new Set<string>(Object.values(DiscountType));
const PAYMENT_TYPE_VALUES = new Set<string>(Object.values(PaymentType));

export function parseChargeType(raw: unknown): ChargeType {
  if (typeof raw === "string" && CHARGE_TYPE_VALUES.has(raw)) {
    return raw as ChargeType;
  }
  return ChargeType.Other;
}

export function parseDiscountType(raw: unknown): DiscountType {
  if (typeof raw === "string" && DISCOUNT_TYPE_VALUES.has(raw)) {
    return raw as DiscountType;
  }
  return DiscountType.Other;
}

export function parsePaymentType(raw: unknown): PaymentType {
  if (typeof raw === "string" && PAYMENT_TYPE_VALUES.has(raw)) {
    return raw as PaymentType;
  }
  return PaymentType.Other;
}

export function normalizeChargeLine(
  line: Partial<ChargeLine> & { amount: number; description?: string }
): ChargeLine {
  const label =
    line.label?.trim() ||
    (typeof line.description === "string" ? line.description.trim() : "");
  return {
    type: line.type ? parseChargeType(line.type) : ChargeType.Other,
    label,
    amount: Math.abs(line.amount),
  };
}

export function normalizeDiscountLine(
  line: Partial<DiscountLine> & { amount: number }
): DiscountLine {
  return {
    type: line.type ? parseDiscountType(line.type) : DiscountType.Other,
    label: line.label?.trim() ?? "",
    amount: Math.abs(line.amount),
  };
}

export function normalizePaymentLine(line: Partial<PaymentLine>): PaymentLine {
  const amount =
    line.amount == null || !Number.isFinite(line.amount)
      ? null
      : Math.abs(line.amount);
  return {
    type: line.type ? parsePaymentType(line.type) : PaymentType.Other,
    label: line.label?.trim() ?? "",
    amount,
  };
}

export function normalizeUnknownLine(line: Partial<UnknownLine>): UnknownLine {
  const amount =
    line.amount == null || !Number.isFinite(line.amount)
      ? null
      : line.amount;
  return {
    label: line.label?.trim() ?? "",
    amount,
    reason: line.reason?.trim() || "unclassified",
    raw: line.raw,
  };
}

/** Read charges from legacy extraCharges / receiptCharges fields. */
export function readChargesField(record: Record<string, unknown>): ChargeLine[] {
  const raw =
    record.charges ?? record.extraCharges ?? record.receiptCharges ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as Record<string, unknown>;
      const amount = Number(obj.amount);
      if (!Number.isFinite(amount) || amount === 0) return null;
      const label =
        typeof obj.label === "string"
          ? obj.label
          : typeof obj.description === "string"
            ? obj.description
            : "";
      if (!label.trim()) return null;
      return normalizeChargeLine({
        type: parseChargeType(obj.type),
        label,
        amount,
      });
    })
    .filter((c): c is ChargeLine => c != null);
}

export function readDiscountsField(
  record: Record<string, unknown>
): DiscountLine[] {
  const raw = record.discounts ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as Record<string, unknown>;
      const amount = Number(obj.amount);
      if (!Number.isFinite(amount) || amount === 0) return null;
      const label = typeof obj.label === "string" ? obj.label : "";
      if (!label.trim()) return null;
      return normalizeDiscountLine({
        type: parseDiscountType(obj.type),
        label,
        amount,
      });
    })
    .filter((d): d is DiscountLine => d != null);
}

export function readPaymentsField(
  record: Record<string, unknown>
): PaymentLine[] {
  const raw = record.payments ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as Record<string, unknown>;
      const label = typeof obj.label === "string" ? obj.label : "";
      if (!label.trim()) return null;
      const amountRaw = obj.amount;
      const amount =
        amountRaw == null || amountRaw === ""
          ? null
          : Number(amountRaw);
      return normalizePaymentLine({
        type: parsePaymentType(obj.type),
        label,
        amount: amount != null && Number.isFinite(amount) ? amount : null,
      });
    })
    .filter((p): p is PaymentLine => p != null);
}

export function readUnknownLinesField(
  record: Record<string, unknown>
): UnknownLine[] {
  const raw = record.unknownLines ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as Record<string, unknown>;
      const label = typeof obj.label === "string" ? obj.label : "";
      if (!label.trim()) return null;
      const amountRaw = obj.amount;
      const amount =
        amountRaw == null || amountRaw === ""
          ? null
          : Number(amountRaw);
      return normalizeUnknownLine({
        label,
        amount: amount != null && Number.isFinite(amount) ? amount : null,
        reason: typeof obj.reason === "string" ? obj.reason : "unclassified",
        raw: typeof obj.raw === "string" ? obj.raw : undefined,
      });
    })
    .filter((u): u is UnknownLine => u != null);
}
