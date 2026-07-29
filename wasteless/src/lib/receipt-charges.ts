import {
  ChargeType,
  DiscountType,
  PaymentType,
  type ChargeLine,
  normalizeChargeLine,
} from "@/lib/receipt-model";

/** Bag / poşet / bez çanta / environmental bag fees — never products. */
const BAG_PATTERN =
  /\b(po[sş]et(\s*(ücreti|ucreti|bedeli))?|alışveriş\s*po[sş]eti|alisveris\s*poseti|market\s*po[sş]eti|market\s*poseti|bez\s*çanta|bez\s*canta|shopping\s*bag|bag\s*fee|çevre\s*katk[ıi]\s*pay[ıi]|cevre\s*katki\s*payi)\b/i;

const SHIPPING_PATTERN =
  /\b(kargo(\s*(bedeli|ücreti|ucreti))?|kargo\s*bedeli|teslimat(\s*(bedeli|ücreti|ucreti))?|delivery(\s*fee)?|shipping(\s*fee)?|nakliye(\s*(bedeli|ücreti|ucreti))?|getirme\s*(ücreti|ucreti))\b/i;

const SERVICE_PATTERN =
  /\b(hizmet\s*(bedeli|ücreti|ucreti)|servis\s*(bedeli|ücreti|ucreti)|service\s*fee|platform\s*(ücreti|ucreti)|işlem\s*(ücreti|ucreti)|islem\s*(ucreti|ucreti)|komisyon)\b/i;

const PACKAGING_PATTERN =
  /\b(paketleme|packaging|ambalaj(\s*(ücreti|ucreti|bedeli))?)\b/i;

const STANDALONE_CHARGE =
  /^(po[sş]et|poset|kargo|teslimat|delivery|shipping|bez\s*çanta|bez\s*canta|servis|hizmet|nakliye)$/i;

export const DISCOUNT_LABEL =
  /\b(indirim|iskonto|discount|kupon|coupon|kampanya\s*indirim|promo(tion)?\s*indirim|puan\s*indirim|loyalty\s*discount)\b/i;

const PAYMENT_LABEL =
  /\b(nakit|kart|kredi\s*kart(?:ı|i)?|credit\s*card|cash|visa|mastercard|banka\s*kart|temassız|temassiz|contactless|ödeme|odeme|payment|taksit)\b/i;

const LOYALTY_DISCOUNT_LABEL =
  /\b(puan\s*indirim|loyalty\s*discount|kampanya\s*indirim)\b/i;

const CAMPAIGN_DISCOUNT_LABEL = /\b(kampanya|campaign|promo)\b/i;

const COUPON_LABEL = /\b(kupon|coupon)\b/i;

export function classifyReceiptCharge(name: string): ChargeType | null {
  const t = name.trim();
  if (!t) return null;

  if (BAG_PATTERN.test(t)) return ChargeType.Bag;
  if (SHIPPING_PATTERN.test(t)) return ChargeType.Shipping;
  if (SERVICE_PATTERN.test(t)) return ChargeType.Service;
  if (PACKAGING_PATTERN.test(t)) return ChargeType.Packaging;

  if (STANDALONE_CHARGE.test(t)) {
    if (/po[sş]et|bez|çevre|cevre/i.test(t)) return ChargeType.Bag;
    if (/kargo|teslimat|delivery|shipping|nakliye/i.test(t)) return ChargeType.Shipping;
    if (/servis|hizmet/i.test(t)) return ChargeType.Service;
  }

  return null;
}

export function classifyDiscountType(name: string): DiscountType {
  const t = name.trim();
  if (LOYALTY_DISCOUNT_LABEL.test(t)) return DiscountType.Loyalty;
  if (COUPON_LABEL.test(t)) return DiscountType.Coupon;
  if (CAMPAIGN_DISCOUNT_LABEL.test(t)) return DiscountType.Campaign;
  if (DISCOUNT_LABEL.test(t)) return DiscountType.Other;
  return DiscountType.Other;
}

export function classifyPaymentType(name: string): PaymentType {
  const t = name.trim().toLocaleLowerCase("tr-TR");
  if (/\bnakit\b|cash/.test(t)) return PaymentType.Cash;
  if (/temassız|temassiz|contactless/.test(t)) return PaymentType.Contactless;
  if (/kredi\s*kart|credit\s*card|visa|mastercard|banka\s*kart|\bkart\b/.test(t))
    return PaymentType.Card;
  if (/karma|mixed|nakit\s*\+\s*kart/.test(t)) return PaymentType.Mixed;
  return PaymentType.Other;
}

export function isReceiptChargeLine(name: string): boolean {
  return classifyReceiptCharge(name) != null;
}

export function isReceiptDiscountLine(name: string): boolean {
  return DISCOUNT_LABEL.test(name.trim());
}

export function isPaymentLine(name: string): boolean {
  return PAYMENT_LABEL.test(name.trim());
}

export function toChargeLine(
  name: string,
  amount: number,
  type?: ChargeType
): ChargeLine {
  const label = name.trim();
  return normalizeChargeLine({
    type: type ?? classifyReceiptCharge(label) ?? ChargeType.Other,
    label,
    amount: Math.abs(amount),
  });
}

/** @deprecated Use toChargeLine */
export const toReceiptChargeLine = toChargeLine;

export { normalizeChargeLine } from "@/lib/receipt-model";

export function appendCharge(
  charges: ChargeLine[],
  name: string,
  amount: number,
  type?: ChargeType
): ChargeLine[] {
  const normalized = toChargeLine(name, amount, type);
  const key = `${normalized.type}:${normalized.label.toLocaleLowerCase("tr-TR")}`;
  const exists = charges.some(
    (c) =>
      `${c.type}:${c.label.toLocaleLowerCase("tr-TR")}` === key &&
      Math.abs(c.amount - normalized.amount) < 0.01
  );
  if (exists) return charges;
  return [...charges, normalized];
}

/** @deprecated Use appendCharge */
export const appendReceiptCharge = appendCharge;
