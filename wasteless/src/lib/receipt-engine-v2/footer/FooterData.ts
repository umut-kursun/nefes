export type FooterPaymentType = "cash" | "credit_card" | "meal_card" | "unknown";

export type FooterPayment = {
  readonly type: FooterPaymentType;
  readonly amount: number | null;
  readonly rawLabel: string;
};

export type FooterData = {
  readonly subtotal: number | null;
  readonly total: number | null;
  readonly vatTotal: number | null;
  readonly payments: readonly FooterPayment[];
};
