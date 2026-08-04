import type { ReceiptProfile } from "../../types";

export type GoldenProductExpected = {
  readonly name: string;
  readonly lineTotal?: number;
  readonly quantity?: number;
  readonly unit?: string;
  readonly nameMatch?: "exact" | "contains";
};

export type GoldenPaymentExpected = {
  readonly label: string;
  readonly amount?: number;
  readonly labelMatch?: "exact" | "contains";
};

export type GoldenExpectedPurchase = {
  readonly profile?: ReceiptProfile;
  readonly merchant?: string | null;
  readonly merchantMatch?: "exact" | "contains";
  readonly purchaseDate?: string | null;
  readonly receiptNumber?: string | null;
  readonly products?: readonly GoldenProductExpected[];
  readonly payments?: readonly GoldenPaymentExpected[];
  readonly charges?: readonly GoldenPaymentExpected[];
  readonly total?: number;
  readonly productCount?: number;
  readonly forbiddenProductPatterns?: readonly string[];
};

export type GoldenFixtureMeta = {
  readonly slug: string;
  readonly label: string;
  readonly category: string;
  readonly legacyRef?: string;
  readonly image?: string | null;
  readonly imageNote?: string;
};

export type GoldenFixture = {
  readonly meta: GoldenFixtureMeta;
  readonly ocrText: string;
  readonly expected: GoldenExpectedPurchase;
};
