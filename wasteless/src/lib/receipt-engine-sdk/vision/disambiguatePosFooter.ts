import { parseTrNumber } from "@/lib/receipt-engine/layer-6-purchase/parsers/parseNumber";
import type { ParsedReceipt, PaymentInfo, ReceiptItem } from "../types/ParsedReceipt";

const FOOTER_AMOUNT = /\*+\s*(\d+(?:[.,]\d+)?)\s*$/;

const TOPKDV_LINE = /\btop\s*k?\s*d?v\b/i;
const TOPLAM_LINE = /^\s*toplam\b/i;

function isPaymentLine(line: string): boolean {
  const lower = line.toLocaleLowerCase("tr-TR");
  if (TOPKDV_LINE.test(line) || TOPLAM_LINE.test(line)) return false;
  return /(?:kredi\s*kart|nakit|visa|mastercard|banka\s*kart)/.test(lower);
}

const INLINE_VAT_PRODUCT =
  /^(.+?)\s+%(\d{1,2})\s+\*+\s*(\d+(?:[.,]\d+)?)\s*$/i;

const UNREADABLE_NAME = /^(?:\*+\s*)?\d+(?:[.,]\d+)?\s*$|^\*+$/;

export type PosFooterAmounts = {
  readonly vatTotal: number | null;
  readonly grandTotal: number | null;
  readonly paymentTotal: number | null;
  readonly paymentLabel: string | null;
};

function parseFooterLineAmount(line: string): number | null {
  const match = line.trim().match(FOOTER_AMOUNT);
  if (!match?.[1]) return null;
  const amount = parseTrNumber(match[1]);
  return amount != null && amount >= 0 ? amount : null;
}

/** Scan raw OCR footer for TOPKDV, TOPLAM, and payment rows. */
export function extractPosFooterAmounts(rawText: string): PosFooterAmounts {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let vatTotal: number | null = null;
  let grandTotal: number | null = null;
  let paymentTotal: number | null = null;
  let paymentLabel: string | null = null;

  for (const line of lines) {
    const amount = parseFooterLineAmount(line);
    if (amount == null) continue;

    if (TOPKDV_LINE.test(line)) {
      vatTotal = amount;
      continue;
    }
    if (TOPLAM_LINE.test(line)) {
      grandTotal = amount;
      continue;
    }
    if (isPaymentLine(line)) {
      paymentTotal = amount;
      paymentLabel = line.replace(FOOTER_AMOUNT, "").trim();
    }
  }

  return { vatTotal, grandTotal, paymentTotal, paymentLabel };
}

function applyInlineVatRate(item: ReceiptItem, rawText: string): ReceiptItem {
  if (item.vatRatePercentage != null) return item;

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(INLINE_VAT_PRODUCT);
    if (!match?.[1] || !match[2] || !match[3]) continue;

    const nameHint = match[1]!.trim();
    const vatRate = Number(match[2]);
    const lineTotal = parseTrNumber(match[3]);
    if (lineTotal == null) continue;

    const nameMatches =
      item.name.trim().toLocaleLowerCase("tr-TR") ===
        nameHint.toLocaleLowerCase("tr-TR") ||
      item.name.trim().toLocaleUpperCase("tr-TR").startsWith(
        nameHint.toLocaleUpperCase("tr-TR")
      );

    if (
      nameMatches &&
      Math.abs(item.lineTotal - lineTotal) <= 0.5 &&
      [1, 8, 10, 18, 20].includes(vatRate)
    ) {
      return { ...item, vatRatePercentage: vatRate as ReceiptItem["vatRatePercentage"] };
    }
  }

  return item;
}

function fixPayments(
  payments: readonly PaymentInfo[],
  footer: PosFooterAmounts,
  grandTotal: number
): PaymentInfo[] {
  if (payments.length === 0 && footer.paymentTotal != null) {
    return [
      {
        type: "CREDIT_CARD",
        bankName: null,
        cardLastFour: null,
        approvalCode: null,
        amount: footer.paymentTotal,
      },
    ];
  }

  return payments.map((p) => {
    const looksLikeVatPayment =
      footer.vatTotal != null &&
      Math.abs(p.amount - footer.vatTotal) <= 0.05 &&
      Math.abs(p.amount - grandTotal) > 0.5;

    if (looksLikeVatPayment && footer.paymentTotal != null) {
      return { ...p, amount: footer.paymentTotal };
    }

    if (
      footer.paymentTotal != null &&
      Math.abs(p.amount - footer.paymentTotal) <= 0.05
    ) {
      return p;
    }

    if (Math.abs(p.amount - grandTotal) > 0.5 && footer.paymentTotal != null) {
      return { ...p, amount: footer.paymentTotal };
    }

    return p;
  });
}

function sanitizeUnreadableName(item: ReceiptItem): ReceiptItem {
  const name = item.name.trim();
  if (!name || UNREADABLE_NAME.test(name)) {
    return { ...item, name: "Okunamayan kalem" };
  }
  return item;
}

/**
 * Fix POS footer confusion: TOPKDV must not become payments[0].amount.
 * TOPLAM drives financials.totalAmount; Kredi Kartı / NAKİT drives payments.
 */
export function disambiguatePosFooter(parsed: ParsedReceipt): ParsedReceipt {
  const rawText = parsed.rawText?.trim();
  if (!rawText) {
    return {
      ...parsed,
      products: parsed.products.map(sanitizeUnreadableName),
    };
  }

  const footer = extractPosFooterAmounts(rawText);
  const grandTotal =
    footer.grandTotal ?? parsed.financials.totalAmount;
  const vatTotal =
    footer.vatTotal ?? parsed.financials.vatTotal ?? null;

  const correctedTotal =
    footer.grandTotal != null &&
    footer.vatTotal != null &&
    Math.abs(parsed.financials.totalAmount - footer.vatTotal) <= 0.05 &&
    Math.abs(parsed.financials.totalAmount - footer.grandTotal) > 0.5
      ? footer.grandTotal
      : grandTotal;

  const products = parsed.products
    .map(sanitizeUnreadableName)
    .map((item) => applyInlineVatRate(item, rawText));

  const payments = fixPayments(parsed.payments, footer, correctedTotal);

  return {
    ...parsed,
    products,
    payments,
    financials: {
      ...parsed.financials,
      totalAmount: correctedTotal,
      vatTotal,
    },
  };
}
