import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReport } from "@/lib/receipt-engine/types/models/validation";
import type { ReceiptEngineV2Result } from "../engine/types";
import type { Purchase } from "../engine/types";
import { classifyPaymentType } from "../footer/parseFooter";

export type BenchmarkRunMetrics = {
  readonly executionTimeMs: number;
  readonly memoryHeapDeltaBytes: number;
};

export type BenchmarkEngineOutput = {
  readonly purchase: Purchase;
  readonly validationScore: number | null;
  readonly validationErrorCount: number;
  readonly validationWarningCount: number;
  readonly validationIsValid: boolean | null;
  readonly metrics: BenchmarkRunMetrics;
};

/** Map V1 PurchaseDraft into the V2 Purchase shape for comparison. */
export function purchaseDraftToPurchase(draft: PurchaseDraft): Purchase {
  const vatLine =
    draft.vatSummary.find((line) => /kdv|vat/i.test(line.label)) ??
    draft.vatSummary[0] ??
    null;

  return {
    merchant: {
      rawName: draft.merchant,
      rawAddress: null,
      rawTaxNumber: null,
    },
    metadata: {
      purchaseDate:
        draft.purchaseDate?.normalized ?? draft.purchaseDate?.raw ?? null,
      purchaseTime: draft.purchaseTime?.normalized ?? draft.purchaseTime?.raw ?? null,
      receiptNumber:
        draft.receiptNumber?.normalized ?? draft.receiptNumber?.raw ?? null,
      currency: draft.currency?.normalized ?? draft.currency?.raw ?? null,
    },
    products: draft.products.map((product) => ({
      rawName: product.name,
      quantity: product.quantity ?? 1,
      unit: (product.unit ?? "ad").toLowerCase(),
      unitPrice: product.unitPrice ?? null,
      lineTotal: product.lineTotal ?? null,
      vatRate: product.vatRate ?? null,
      discounts: [],
    })),
    charges: draft.charges.map((charge) => ({
      rawName: charge.label,
      amount: charge.amount ?? 0,
      vatRate: null,
    })),
    footer: {
      subtotal: draft.subtotal?.amount ?? null,
      total: draft.total?.amount ?? null,
      vatTotal: vatLine?.amount ?? null,
      payments: draft.payments.map((payment) => ({
        type: classifyPaymentType(payment.label),
        amount: payment.amount ?? null,
        rawLabel: payment.label,
      })),
    },
  };
}

export function receiptEngineV2ResultToPurchase(result: ReceiptEngineV2Result): Purchase {
  return result.purchase;
}

export function wrapV1Output(
  draft: PurchaseDraft,
  validation: ValidationReport,
  metrics: BenchmarkRunMetrics
): BenchmarkEngineOutput {
  return {
    purchase: purchaseDraftToPurchase(draft),
    validationScore: validation.score,
    validationErrorCount: validation.errors.length,
    validationWarningCount: validation.warnings.length,
    validationIsValid: validation.isValid,
    metrics,
  };
}

export function wrapV2Output(
  result: ReceiptEngineV2Result,
  metrics: BenchmarkRunMetrics
): BenchmarkEngineOutput {
  return {
    purchase: result.purchase,
    validationScore: null,
    validationErrorCount: 0,
    validationWarningCount: 0,
    validationIsValid: null,
    metrics,
  };
}

/** Sum product-level and footer-level discount amounts from a V1 draft. */
export function v1DiscountTotal(draft: PurchaseDraft): number {
  const footerDiscounts = draft.discounts.reduce(
    (sum, line) => sum + (line.amount ?? 0),
    0
  );
  return footerDiscounts;
}

/** Sum product-level discount amounts from a V2 purchase. */
export function v2DiscountTotal(purchase: Purchase): number {
  return purchase.products.reduce(
    (sum, product) =>
      sum + product.discounts.reduce((lineSum, discount) => lineSum + discount.amount, 0),
    0
  );
}

export function goldenDiscountTotal(
  golden: import("../tests/golden/GoldenExpectation").GoldenExpectation
): number {
  if (!golden.products) return 0;
  return golden.products.reduce((sum, product) => {
    if (product.discount != null) return sum + product.discount;
    if (product.discounts?.length) {
      return sum + product.discounts.reduce((lineSum, d) => lineSum + d.amount, 0);
    }
    return sum;
  }, 0);
}
