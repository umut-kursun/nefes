export const LineRole = {
  MerchantHeader: "merchant_header",
  Metadata: "metadata",
  BodyProduct: "body_product",
  FooterTotal: "footer_total",
  FooterVat: "footer_vat",
  FooterPayment: "footer_payment",
  CategorySubtotal: "category_subtotal",
  Ignore: "ignore",
} as const;

export type LineRole = (typeof LineRole)[keyof typeof LineRole];

export type RoleAnnotatedLine = {
  readonly index: number;
  readonly raw: string;
  readonly role: LineRole;
};
