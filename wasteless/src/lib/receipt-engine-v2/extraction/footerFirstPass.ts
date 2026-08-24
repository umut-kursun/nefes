import type { FooterData, FooterPayment, FooterPaymentType } from "../footer/FooterData";
import {
  BANK_NAME_ONLY,
  BARE_AMOUNT_LINE,
  CARD_METADATA,
  DISCOUNT_SECTION,
  extractStarAmounts,
  extractTrailingAmount,
  AMOUNT_ONLY_LINE,
  PAYMENT_METHOD,
  SUBTOTAL_LABEL,
  TOTAL_LABEL,
  VAT_LABEL,
} from "./linePatterns";
import type { FieldProvenance } from "./types";

type PendingAnchor = "vat" | "total" | "payment";

type PendingFlags = {
  vat: boolean;
  total: boolean;
  payment: boolean;
};

function resolvePendingAnchor(
  flags: PendingFlags,
  vat: FooterField | null,
  footerTotal: FooterField | null
): PendingAnchor | null {
  if (flags.vat && vat == null) return "vat";
  if (flags.total && footerTotal == null) return "total";
  if (flags.payment) return "payment";
  return null;
}

type FooterField = {
  value: number;
  provenance: FieldProvenance;
};

type PaymentDraft = {
  type: FooterPaymentType;
  amount: number | null;
  rawLabel: string;
  lineIndices: number[];
  method: string;
};

function stripCardMasks(raw: string): string {
  return raw
    .replace(/#?\d*\*{4,}\d+/g, " ")
    .replace(/\*{4,}\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Masked PAN lines (e.g. *454360********4421) — footer metadata, not products. */
function isCardMaskLine(raw: string): boolean {
  const trimmed = raw.trim();
  if (/^#?\d*\*{4,}\d+/.test(trimmed)) return true;
  if (/^\*\d[\d*]+\d{2,}$/.test(trimmed) && trimmed.includes("****")) return true;
  return false;
}

function isFooterMetadataLine(raw: string): boolean {
  return CARD_METADATA.test(raw) || isCardMaskLine(raw) || BANK_NAME_ONLY.test(raw);
}

function paymentTypeFromLabel(label: string): FooterPaymentType {
  const upper = label.toUpperCase();
  if (/NAK[İI]T/.test(upper)) return "cash";
  if (/KRED[İI]|BANKA|ORTAK\s*POS|DEB[İI]T|VISA|MASTERCARD|K\.?\s*KARTI/i.test(upper)) {
    return "credit_card";
  }
  if (/YEMEK|MULT[İI]NET|SODEXO|TICKET|SETCARD|METROPOL/i.test(upper)) return "meal_card";
  return "unknown";
}

function fieldConfidence(lineCount: number, hasLabel: boolean): number {
  const base = hasLabel ? 0.88 : 0.72;
  return Math.min(0.98, base + lineCount * 0.02);
}

function findFooterStartIndex(lines: readonly string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    if (DISCOUNT_SECTION.test(raw)) return i;
    if (VAT_LABEL.test(raw)) {
      return i > 0 && AMOUNT_ONLY_LINE.test(lines[i - 1] ?? "") ? i - 1 : i;
    }
    if (TOTAL_LABEL.test(raw) && !isProductLikeTotalLine(raw)) {
      return i > 0 && AMOUNT_ONLY_LINE.test(lines[i - 1] ?? "") ? i - 1 : i;
    }
  }

  const tailStart = Math.max(0, lines.length - 10);
  let paymentIdx = -1;
  for (let i = tailStart; i < lines.length; i++) {
    if (PAYMENT_METHOD.test(lines[i] ?? "")) {
      paymentIdx = i;
      break;
    }
  }

  if (paymentIdx >= 0) {
    let clusterStart = paymentIdx;
    for (let j = paymentIdx - 1; j >= tailStart; j--) {
      const raw = (lines[j] ?? "").trim();
      if (!raw) continue;
      if (BARE_AMOUNT_LINE.test(raw) || AMOUNT_ONLY_LINE.test(raw)) {
        clusterStart = j;
        continue;
      }
      if (isFooterMetadataLine(raw)) continue;
      break;
    }
    return clusterStart;
  }

  return lines.length;
}

function isProductLikeTotalLine(raw: string): boolean {
  return /[A-Za-zÇĞİÖŞÜ]{4,}/.test(raw) && /\*\d/.test(raw) && !TOTAL_LABEL.test(raw.split("*")[0] ?? "");
}

function isLikelyVatAmount(amount: number, total: number): boolean {
  if (amount >= total) return false;
  if (amount <= 0) return false;
  if (total > 100 && amount <= 20 && [1, 8, 10, 18, 20].includes(Math.round(amount))) {
    return false;
  }
  return amount < total * 0.35;
}

/**
 * When TOPLAM/TOPKDV labels are absent, infer total from bare footer amounts that
 * agree with an explicit payment line — never pick the largest amount blindly.
 */
function resolveLabelLessFooterTotal(
  lines: readonly string[],
  footerStartIndex: number,
  captured: {
    vat: FooterField | null;
    total: FooterField | null;
  },
  paymentDrafts: PaymentDraft[]
): void {
  if (captured.total != null) return;

  const explicitPayment = paymentDrafts.find(
    (p) => p.amount != null && PAYMENT_METHOD.test(p.rawLabel)
  );
  if (explicitPayment?.amount == null) return;

  const paymentAmount = explicitPayment.amount;
  const paymentLineIndex =
    explicitPayment.lineIndices[0] ?? Math.max(0, lines.length - 1);
  const scanStart = Math.max(0, paymentLineIndex - 8, footerStartIndex);
  const bareAmounts: { amount: number; lineIndex: number }[] = [];

  for (let i = scanStart; i < lines.length; i++) {
    const raw = (lines[i] ?? "").trim();
    if (!BARE_AMOUNT_LINE.test(raw)) continue;
    const amount = extractTrailingAmount(raw);
    if (amount == null) continue;
    bareAmounts.push({ amount, lineIndex: i });
  }

  const totalCandidate = bareAmounts.find(
    (b) =>
      Math.abs(b.amount - paymentAmount) < 0.01 &&
      b.amount !== captured.vat?.value
  );

  if (!totalCandidate) return;

  captured.total = {
    value: totalCandidate.amount,
    provenance: {
      value: totalCandidate.amount,
      confidence: fieldConfidence(1, false),
      sourceLineIndices: [totalCandidate.lineIndex],
      method: "footer:label-less-total-payment-match",
    },
  };

  if (captured.vat != null) return;

  const vatCandidate = bareAmounts
    .filter(
      (b) =>
        b.lineIndex < totalCandidate.lineIndex &&
        b.amount !== totalCandidate.amount &&
        isLikelyVatAmount(b.amount, totalCandidate.amount)
    )
    .sort((a, b) => b.lineIndex - a.lineIndex)[0];

  if (vatCandidate) {
    captured.vat = {
      value: vatCandidate.amount,
      provenance: {
        value: vatCandidate.amount,
        confidence: fieldConfidence(1, false),
        sourceLineIndices: [vatCandidate.lineIndex],
        method: "footer:label-less-vat-before-total",
      },
    };
  }
}

export type FooterExtraction = {
  footer: FooterData;
  footerStartIndex: number;
  vatProvenance: FieldProvenance | null;
  totalProvenance: FieldProvenance | null;
  subtotalProvenance: FieldProvenance | null;
  paymentProvenances: readonly FieldProvenance[];
};

export function extractFooterFirst(lines: readonly string[]): FooterExtraction {
  const footerStartIndex = findFooterStartIndex(lines);
  const pendingFlags: PendingFlags = { vat: false, total: false, payment: false };
  let expectTotalAfterVat = false;
  const captured = {
    vat: null as FooterField | null,
    total: null as FooterField | null,
    subtotal: null as FooterField | null,
  };
  const paymentDrafts: PaymentDraft[] = [];
  let currentPayment: PaymentDraft | null = null;

  const assignAmount = (
    amount: number,
    lineIndex: number,
    anchor: PendingAnchor,
    label: string,
    method: string
  ) => {
    const prov: FieldProvenance = {
      value: amount,
      confidence: fieldConfidence(1, Boolean(label)),
      sourceLineIndices: [lineIndex],
      method,
    };

    if (anchor === "vat" && captured.vat == null) {
      captured.vat = { value: amount, provenance: prov };
      pendingFlags.vat = false;
      expectTotalAfterVat = true;
      return;
    }
    if (anchor === "total" && captured.total == null) {
      captured.total = { value: amount, provenance: prov };
      pendingFlags.total = false;
      expectTotalAfterVat = false;
      return;
    }
    if (anchor === "payment") {
      if (currentPayment && currentPayment.amount == null) {
        currentPayment.amount = amount;
        currentPayment.lineIndices.push(lineIndex);
        currentPayment.method = `${currentPayment.method}+amount`;
      } else {
        currentPayment = {
          type: paymentTypeFromLabel(label),
          amount,
          rawLabel: label || "Ödeme",
          lineIndices: [lineIndex],
          method,
        };
        paymentDrafts.push(currentPayment);
      }
      pendingFlags.payment = false;
    }
  };

  const assignOrphanAmount = (amount: number, lineIndex: number, raw: string) => {
    if (
      expectTotalAfterVat &&
      captured.total == null &&
      captured.vat != null &&
      amount !== captured.vat.value
    ) {
      assignAmount(amount, lineIndex, "total", raw, "footer:post-vat-total");
      expectTotalAfterVat = false;
      return true;
    }
    const anchor = resolvePendingAnchor(pendingFlags, captured.vat, captured.total);
    if (anchor) {
      assignAmount(amount, lineIndex, anchor, raw, `footer:orphan-amount→${anchor}`);
      return true;
    }
    return false;
  };

  const isSuspiciousVatRatePayment = (amount: number): boolean => {
    if (captured.total?.value != null && captured.total.value > 100 && amount <= 20) {
      return [1, 8, 10, 18, 20].includes(Math.round(amount));
    }
    return false;
  };

  for (let i = footerStartIndex; i < lines.length; i++) {
    const raw = (lines[i] ?? "").trim();
    if (!raw) continue;
    if (DISCOUNT_SECTION.test(raw) && !/\*\d/.test(raw)) continue;
    if (isFooterMetadataLine(raw) && !PAYMENT_METHOD.test(raw)) continue;
    if (BANK_NAME_ONLY.test(raw)) continue;

    const amountSource = stripCardMasks(raw);
    const inlineAmounts = extractStarAmounts(amountSource);
    const inlineAmount =
      inlineAmounts.length === 1
        ? inlineAmounts[0]!
        : extractTrailingAmount(amountSource);

    if (VAT_LABEL.test(raw)) {
      pendingFlags.vat = true;
      if (inlineAmount != null) {
        assignAmount(inlineAmount, i, "vat", raw, "footer:vat-label-inline");
      }
      continue;
    }

    if (SUBTOTAL_LABEL.test(raw)) {
      if (inlineAmount != null) {
        captured.subtotal = {
          value: inlineAmount,
          provenance: {
            value: inlineAmount,
            confidence: fieldConfidence(1, true),
            sourceLineIndices: [i],
            method: "footer:subtotal-inline",
          },
        };
      }
      continue;
    }

    if (TOTAL_LABEL.test(raw) && !isProductLikeTotalLine(raw)) {
      pendingFlags.total = true;
      if (inlineAmount != null) {
        assignAmount(inlineAmount, i, "total", raw, "footer:total-label-inline");
      }
      continue;
    }

    if (PAYMENT_METHOD.test(raw) && !VAT_LABEL.test(raw) && !TOTAL_LABEL.test(raw)) {
      pendingFlags.payment = true;
      const paymentLabel = stripCardMasks(raw) || raw;
      const paymentAmount =
        inlineAmount ?? (captured.total?.value != null ? captured.total.value : null);
      currentPayment = {
        type: paymentTypeFromLabel(paymentLabel),
        amount: paymentAmount,
        rawLabel: paymentLabel,
        lineIndices: [i],
        method: "footer:payment-method",
      };
      paymentDrafts.push(currentPayment);
      if (paymentAmount != null) pendingFlags.payment = false;
      continue;
    }

    if (
      (BARE_AMOUNT_LINE.test(raw) || AMOUNT_ONLY_LINE.test(raw)) &&
      resolvePendingAnchor(pendingFlags, captured.vat, captured.total)
    ) {
      const amount = extractTrailingAmount(raw);
      if (amount != null) {
        assignOrphanAmount(amount, i, raw);
      }
      continue;
    }

    if (inlineAmount != null && resolvePendingAnchor(pendingFlags, captured.vat, captured.total)) {
      assignOrphanAmount(inlineAmount, i, raw);
      continue;
    }

    if (AMOUNT_ONLY_LINE.test(raw) && !resolvePendingAnchor(pendingFlags, captured.vat, captured.total)) {
      const amount = extractTrailingAmount(raw);
      if (amount == null) continue;
      if (isSuspiciousVatRatePayment(amount)) continue;
      if (captured.vat?.value === amount || captured.total?.value === amount) continue;
      if (paymentDrafts.some((p) => p.amount === amount)) continue;
      if (
        captured.total?.value != null &&
        amount === captured.total.value &&
        paymentDrafts.some((p) => p.amount === captured.total!.value)
      ) {
        continue;
      }
      currentPayment = {
        type: "unknown",
        amount,
        rawLabel: "Ödeme",
        lineIndices: [i],
        method: "footer:amount-only-line",
      };
      paymentDrafts.push(currentPayment);
      continue;
    }

    if (BARE_AMOUNT_LINE.test(raw) && !resolvePendingAnchor(pendingFlags, captured.vat, captured.total)) {
      const amount = extractTrailingAmount(raw);
      if (amount == null) continue;
      if (isSuspiciousVatRatePayment(amount)) continue;
      if (captured.vat?.value === amount || captured.total?.value === amount) continue;
      const existingPayment = paymentDrafts.find((p) => p.amount === amount);
      if (existingPayment) continue;
      if (
        captured.total?.value != null &&
        amount === captured.total.value &&
        paymentDrafts.some((p) => p.amount === captured.total!.value)
      ) {
        continue;
      }
      currentPayment = {
        type: "unknown",
        amount,
        rawLabel: "Ödeme",
        lineIndices: [i],
        method: "footer:orphan-payment-amount",
      };
      paymentDrafts.push(currentPayment);
    }
  }

  resolveLabelLessFooterTotal(lines, footerStartIndex, captured, paymentDrafts);

  const payments = resolveContextualPayments(paymentDrafts, captured.total?.value ?? null);
  const subtotalAmount = captured.subtotal?.value ?? null;
  const totalAmount = captured.total?.value ?? null;
  const vatAmount = captured.vat?.value ?? null;

  return {
    footerStartIndex,
    footer: {
      subtotal: subtotalAmount,
      total: totalAmount,
      vatTotal: vatAmount,
      payments,
    },
    vatProvenance: captured.vat?.provenance ?? null,
    totalProvenance: captured.total?.provenance ?? null,
    subtotalProvenance: captured.subtotal?.provenance ?? null,
    paymentProvenances: payments.map((p, idx) => ({
      value: p.amount,
      confidence: fieldConfidence(paymentDrafts[idx]?.lineIndices.length ?? 1, true),
      sourceLineIndices: paymentDrafts[idx]?.lineIndices ?? [],
      method: paymentDrafts[idx]?.method ?? "footer:payment",
    })),
  };
}

function resolveContextualPayments(
  drafts: PaymentDraft[],
  receiptTotal: number | null
): FooterPayment[] {
  const merged: PaymentDraft[] = [];

  for (const draft of drafts) {
    if (draft.amount == null) continue;
    if (receiptTotal != null && draft.amount === receiptTotal && draft.rawLabel === "Ödeme") {
      const hasExplicitMethod = drafts.some(
        (d) => d !== draft && PAYMENT_METHOD.test(d.rawLabel) && d.amount === receiptTotal
      );
      if (hasExplicitMethod) continue;
    }

    const duplicate = merged.find(
      (m) =>
        m.amount === draft.amount &&
        m.type === draft.type &&
        (m.rawLabel === draft.rawLabel ||
          (PAYMENT_METHOD.test(m.rawLabel) && PAYMENT_METHOD.test(draft.rawLabel)))
    );
    if (duplicate) {
      duplicate.lineIndices = [...duplicate.lineIndices, ...draft.lineIndices];
      continue;
    }
    merged.push({ ...draft });
  }

  return merged.map((d) => ({
    type: d.type,
    amount: d.amount,
    rawLabel: d.rawLabel,
  }));
}

export { findFooterStartIndex };
