import { LineKind } from "../tokenizer/LineKind";
import type { TokenizedLine } from "../tokenizer/TokenizedLine";
import type { FooterData, FooterPayment, FooterPaymentType } from "./FooterData";

const FOOTER_LINE_KINDS: ReadonlySet<LineKind> = new Set([
  LineKind.Subtotal,
  LineKind.VatTotal,
  LineKind.GrandTotal,
  LineKind.PaymentHeader,
  LineKind.PaymentAmount,
  LineKind.Footer,
]);

const STAR_AMOUNT =
  /\*(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:[.,]\d+)?)/g;

const TAIL_AMOUNT = /\s(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;

const MEAL_CARD_LABEL =
  /(?:MULTINET|TICKET|SODEXO|SETCARD|METROPOL|PLUXEE|EDENRED|TOKEN|YEMEK\s*KART)/i;

const CASH_LABEL = /NAK[İI]T/i;

const CARD_LABEL =
  /(?:BANKA\s*\/\s*KRED[İI]|KRED[İI]\s*KART|VISA|MASTERCARD|DEB[İI]T|YAPI\s*KRED[İI]|Z[İI]RAAT|GARANT[İI]|AKBANK|[İI][ŞS]\s*BANK|POS\s*[ÖO]DEME|ÖDEME|ODEME)/i;

function parseTurkishAmount(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, "");
  if (!s) return null;

  const negative = s.includes("-");
  s = s.replace(/-/g, "").replace(/^\*+/, "");
  if (!s) return null;

  if (/,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

function extractAmount(raw: string): number | null {
  const starMatches = [...raw.matchAll(STAR_AMOUNT)];
  if (starMatches.length > 0) {
    const last = starMatches[starMatches.length - 1]?.[1];
    return last ? parseTurkishAmount(last) : null;
  }

  const tail = raw.match(TAIL_AMOUNT);
  if (tail?.[1]) return parseTurkishAmount(tail[1]);

  const tlAmount = raw.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[.,]\d+)?)\s*TL\b/i);
  if (tlAmount?.[1]) return parseTurkishAmount(tlAmount[1]);

  const inline = raw.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[.,]\d+)?)\s*$/);
  return inline?.[1] ? parseTurkishAmount(inline[1]) : null;
}

function classifyPaymentType(label: string): FooterPaymentType {
  if (CASH_LABEL.test(label)) return "cash";
  if (MEAL_CARD_LABEL.test(label)) return "meal_card";
  if (CARD_LABEL.test(label)) return "credit_card";
  return "unknown";
}

function stripAmountFromLabel(raw: string): string {
  return raw
    .replace(STAR_AMOUNT, "")
    .replace(TAIL_AMOUNT, "")
    .replace(/\s(\d+(?:[.,]\d+)?)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pushPayment(
  payments: FooterPayment[],
  rawLabel: string,
  amount: number | null
): void {
  payments.push({
    type: classifyPaymentType(rawLabel),
    amount,
    rawLabel,
  });
}

/** Parse receipt footer totals and payments from tokenized lines. */
export function parseFooter(lines: readonly TokenizedLine[]): FooterData {
  let subtotal: number | null = null;
  let total: number | null = null;
  let vatTotal: number | null = null;
  const payments: FooterPayment[] = [];
  let pendingPaymentLabel: string | null = null;

  for (const line of lines) {
    if (!FOOTER_LINE_KINDS.has(line.kind)) {
      continue;
    }

    switch (line.kind) {
      case LineKind.Subtotal:
        subtotal = extractAmount(line.raw);
        break;

      case LineKind.VatTotal:
        vatTotal = extractAmount(line.raw);
        break;

      case LineKind.GrandTotal:
        total = extractAmount(line.raw);
        break;

      case LineKind.PaymentHeader: {
        const amount = extractAmount(line.raw);
        const label = stripAmountFromLabel(line.raw) || line.raw.trim();
        if (amount != null) {
          pushPayment(payments, label, amount);
          pendingPaymentLabel = null;
        } else {
          pendingPaymentLabel = label;
        }
        break;
      }

      case LineKind.PaymentAmount: {
        const amount = extractAmount(line.raw);
        const label = pendingPaymentLabel ?? line.raw.trim();
        pushPayment(payments, label, amount);
        pendingPaymentLabel = null;
        break;
      }

      case LineKind.Footer: {
        if (!MEAL_CARD_LABEL.test(line.raw) && !CARD_LABEL.test(line.raw) && !CASH_LABEL.test(line.raw)) {
          break;
        }
        const amount = extractAmount(line.raw);
        const label = stripAmountFromLabel(line.raw) || line.raw.trim();
        pushPayment(payments, label, amount);
        break;
      }

      default:
        break;
    }
  }

  if (pendingPaymentLabel) {
    pushPayment(payments, pendingPaymentLabel, null);
  }

  return {
    subtotal,
    total,
    vatTotal,
    payments,
  };
}

export { FOOTER_LINE_KINDS, classifyPaymentType, extractAmount };
