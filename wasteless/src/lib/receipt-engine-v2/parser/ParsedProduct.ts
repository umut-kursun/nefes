export type ParsedDiscount = {
  readonly rawText: string;
  readonly amount: number;
};

export type ParsedProduct = {
  readonly rawName: string;
  readonly quantity: number;
  readonly unit: string;
  readonly unitPrice: number | null;
  readonly lineTotal: number | null;
  readonly vatRate: number | null;
  readonly discounts: readonly ParsedDiscount[];
};

export type ParsedProductList = {
  readonly products: readonly ParsedProduct[];
};
