export const LineKind = {
  Unknown: "unknown",
  Empty: "empty",
  MerchantHeader: "merchant_header",
  Metadata: "metadata",
  ProductCandidate: "product_candidate",
  QuantityDetail: "quantity_detail",
  DiscountCandidate: "discount_candidate",
  ChargeCandidate: "charge_candidate",
  Subtotal: "subtotal",
  VatTotal: "vat_total",
  GrandTotal: "grand_total",
  PaymentHeader: "payment_header",
  /** Orphan star amount — resolved by footer-first extraction, not a payment by default. */
  OrphanAmount: "orphan_amount",
  /** @deprecated Prefer OrphanAmount — kept for legacy tests referencing PaymentAmount. */
  PaymentAmount: "payment_amount",
  Footer: "footer",
} as const;

export type LineKind = (typeof LineKind)[keyof typeof LineKind];

export const LINE_KINDS = Object.values(LineKind);
