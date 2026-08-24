import type { FooterData, FooterPayment } from "../../footer/FooterData";
import type { ParsedDiscount, ParsedProduct } from "../../parser/ParsedProduct";
import type { Purchase } from "../../engine/types";

export type GoldenExpectedDiscount = {
  readonly rawText?: string;
  readonly amount: number;
};

export type GoldenExpectedProduct = {
  readonly rawName: string;
  readonly quantity?: number;
  readonly unit?: string;
  readonly unitPrice?: number | null;
  readonly lineTotal?: number | null;
  readonly vatRate?: number | null;
  /** Shorthand for the first discount amount on the line. */
  readonly discount?: number | null;
  readonly discounts?: readonly GoldenExpectedDiscount[];
};

export type GoldenExpectedPayment = {
  readonly type?: FooterPayment["type"];
  readonly amount?: number | null;
  readonly rawLabel?: string;
};

export type GoldenExpectedFooter = {
  readonly subtotal?: number | null;
  readonly total?: number | null;
  readonly vatTotal?: number | null;
  readonly payments?: readonly GoldenExpectedPayment[];
};

/** Field-by-field expected purchase output for golden regression tests. */
export type GoldenExpectation = {
  readonly merchant?: string | null;
  readonly purchaseDate?: string | null;
  readonly purchaseTime?: string | null;
  readonly receiptNumber?: string | null;
  readonly currency?: string | null;
  readonly productCount?: number;
  readonly products?: readonly GoldenExpectedProduct[];
  readonly footer?: GoldenExpectedFooter;
  /** Shorthand for `footer.total`. */
  readonly total?: number | null;
  /** Shorthand for `footer.vatTotal`. */
  readonly vatTotal?: number | null;
  /** Shorthand for the first footer payment. */
  readonly payment?: GoldenExpectedPayment | null;
};

function serializeDiscount(d: ParsedDiscount): GoldenExpectedDiscount {
  return { rawText: d.rawText, amount: d.amount };
}

function serializeProduct(p: ParsedProduct): GoldenExpectedProduct {
  const product: GoldenExpectedProduct = {
    rawName: p.rawName,
    quantity: p.quantity,
    unit: p.unit,
    unitPrice: p.unitPrice,
    lineTotal: p.lineTotal,
    vatRate: p.vatRate,
  };

  if (p.discounts.length === 1) {
    return { ...product, discount: p.discounts[0]?.amount ?? null };
  }

  if (p.discounts.length > 0) {
    return { ...product, discounts: p.discounts.map(serializeDiscount) };
  }

  return product;
}

function serializeFooter(footer: FooterData): GoldenExpectedFooter {
  return {
    subtotal: footer.subtotal,
    total: footer.total,
    vatTotal: footer.vatTotal,
    payments: footer.payments.map((payment) => ({
      type: payment.type,
      amount: payment.amount,
      rawLabel: payment.rawLabel,
    })),
  };
}

/** Convert a live purchase into a golden expectation snapshot. */
export function purchaseToGoldenExpectation(purchase: Purchase): GoldenExpectation {
  const footer = serializeFooter(purchase.footer);
  const firstPayment = purchase.footer.payments[0] ?? null;

  return {
    merchant: purchase.merchant.rawName,
    purchaseDate: purchase.metadata.purchaseDate,
    purchaseTime: purchase.metadata.purchaseTime,
    receiptNumber: purchase.metadata.receiptNumber,
    currency: purchase.metadata.currency,
    productCount: purchase.products.length,
    products: purchase.products.map(serializeProduct),
    footer,
    total: footer.total ?? null,
    vatTotal: footer.vatTotal ?? null,
    payment: firstPayment
      ? {
          type: firstPayment.type,
          amount: firstPayment.amount,
          rawLabel: firstPayment.rawLabel,
        }
      : null,
  };
}
