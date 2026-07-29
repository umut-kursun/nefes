import { ChargeType, DiscountType, PaymentType } from "@/lib/receipt-model";
import {
  classifyDiscountType,
  classifyPaymentType,
  classifyReceiptCharge,
  isPaymentLine,
  isReceiptChargeLine,
  isReceiptDiscountLine,
} from "@/lib/receipt-charges";

export type ReceiptLineKind =
  | "product"
  | "receipt_charge"
  | "discount"
  | "payment"
  | "loyalty"
  | "unknown";

export type ReceiptLineClassification = {
  kind: ReceiptLineKind;
  reason: string;
  label: string;
  amount: number | null;
  raw: string;
  chargeType?: ChargeType;
  discountType?: DiscountType;
  paymentType?: PaymentType;
};

const LOYALTY_LABEL =
  /\b(puan\s*(?:kazanım|kazanim|indirim|kullanım|kullanim)?|loyalty|kampanya\s*(?:indirim|puan)?|campaign|happy\s*points|money\s*bonus|carrefour\s*card|club\s*card|sadakat|bonus\s*puan)\b/i;

const FOOTER_ONLY =
  /^(toplam|kdv|ödenecek|odenecek|ara\s*toplam|subtotal|genel\s*toplam|fiş\s*no|fis\s*no|z\s*no|mali\s*değer|mali\s*deger|vergi\s*no|vk[nıi]|teşekkür|tesekkur|para\s*üstü|paraustu)$/i;

export function classifyReceiptLine(
  name: string,
  amount: number | null,
  raw: string
): ReceiptLineClassification {
  const label = name.trim();
  const base = { label, amount, raw };

  if (!label || label.length < 2) {
    return { ...base, kind: "unknown", reason: "empty or too-short line" };
  }

  const chargeType = classifyReceiptCharge(label);
  if (chargeType) {
    return {
      ...base,
      kind: "receipt_charge",
      chargeType,
      reason: `receipt charge label matched type=${chargeType}`,
    };
  }

  if (isReceiptDiscountLine(label)) {
    const discountType = classifyDiscountType(label);
    return {
      ...base,
      kind: "discount",
      discountType,
      reason: `discount label matched type=${discountType}`,
    };
  }

  if (isPaymentLine(label)) {
    const paymentType = classifyPaymentType(label);
    return {
      ...base,
      kind: "payment",
      paymentType,
      reason: `payment label matched type=${paymentType}`,
    };
  }

  if (LOYALTY_LABEL.test(label)) {
    return {
      ...base,
      kind: "loyalty",
      discountType: DiscountType.Loyalty,
      reason: "loyalty/campaign label matched",
    };
  }

  if (FOOTER_ONLY.test(label) && (amount == null || amount <= 0)) {
    return {
      ...base,
      kind: "unknown",
      reason: "receipt footer label (no amount)",
    };
  }

  if (looksLikeProductLine(label, amount)) {
    return { ...base, kind: "product", reason: "grocery product line" };
  }

  return {
    ...base,
    kind: "unknown",
    reason:
      amount != null && amount > 0
        ? "unclassified line with amount — kept for review"
        : "unclassified line without amount",
  };
}

function looksLikeProductLine(label: string, amount: number | null): boolean {
  if (isReceiptChargeLine(label)) return false;
  if (isReceiptDiscountLine(label)) return false;
  if (isPaymentLine(label)) return false;
  if (LOYALTY_LABEL.test(label)) return false;
  if (FOOTER_ONLY.test(label)) return false;
  if (label.length < 2) return false;
  if (amount != null && amount > 0) return true;
  if (/[a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}/.test(label) && label.length >= 3) return true;
  return false;
}

export type ClassificationLogEntry = {
  raw: string;
  label: string;
  kind: ReceiptLineKind;
  reason: string;
  amount: number | null;
  chargeType?: ChargeType;
  discountType?: DiscountType;
  paymentType?: PaymentType;
  action:
    | "kept_product"
    | "moved_charge"
    | "moved_discount"
    | "moved_payment"
    | "moved_unknown"
    | "skipped_noise";
};

export function formatClassificationLog(
  entries: ClassificationLogEntry[]
): string[] {
  return entries.map(
    (e) =>
      `[${e.kind}] ${e.action}: "${e.label}"${e.amount != null ? ` (${e.amount})` : ""} — ${e.reason}`
  );
}
