import { z } from "zod";
import type { AnalysisResult } from "@/lib/types";
import { coerceMoney } from "@/lib/money";
import { preprocessAnalysisJson } from "@/lib/receipt-quality";

const moneyField = z.preprocess(
  (v) => coerceMoney(v),
  z.union([z.number(), z.null()])
);

const positiveMoneyField = z.preprocess(
  (v) => {
    const n = coerceMoney(v);
    if (n == null) return 0;
    return Math.abs(n);
  },
  z.number()
);

const nullableString = z.union([z.string(), z.null()]);

const chargeLineSchema = z.object({
  type: z
    .enum(["bag", "shipping", "service", "packaging", "other"])
    .default("other"),
  label: z.string(),
  amount: positiveMoneyField,
});

const discountLineSchema = z.object({
  type: z
    .enum(["coupon", "campaign", "loyalty", "other"])
    .default("other"),
  label: z.string(),
  amount: positiveMoneyField,
});

const paymentLineSchema = z.object({
  type: z
    .enum(["cash", "card", "contactless", "mixed", "other"])
    .default("other"),
  label: z.string(),
  amount: z.preprocess(
    (v) => {
      if (v == null || v === "") return null;
      const n = coerceMoney(v);
      return n == null ? null : Math.abs(n);
    },
    z.union([z.number(), z.null()])
  ),
});

const unknownLineSchema = z.object({
  label: z.string(),
  amount: moneyField,
  reason: z.string(),
  raw: nullableString.optional(),
});

export const analysisResultSchema = z.object({
  sourceType: z.enum(["receipt", "bank_screenshot"]),
  merchantName: nullableString,
  date: nullableString,
  time: nullableString.default(null),
  category: z.string().min(1).default("other"),
  subCategory: nullableString,
  currency: z.string().default("TRY"),
  totalAmount: moneyField,
  confidence: z.preprocess(
    (v) => (typeof v === "number" ? v : coerceMoney(v) ?? 0),
    z.number().min(0).max(1)
  ),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: moneyField,
        unit: nullableString,
        unitPrice: moneyField,
        totalPrice: moneyField,
        ocrName: nullableString.optional(),
        confidence: z
          .preprocess(
            (v) => (typeof v === "number" ? v : coerceMoney(v) ?? null),
            z.union([z.number().min(0).max(1), z.null()])
          )
          .optional(),
      })
    )
    .default([]),
  charges: z.array(chargeLineSchema).default([]),
  discounts: z.array(discountLineSchema).default([]),
  payments: z.array(paymentLineSchema).default([]),
  unknownLines: z.array(unknownLineSchema).default([]),
  fuel: z
    .union([
      z.object({
        fuelType: nullableString,
        liters: moneyField,
        pricePerLiter: moneyField,
        stationName: nullableString,
        odometer: moneyField,
        plate: nullableString.default(null),
      }),
      z.null(),
    ])
    .default(null),
  packCount: moneyField.default(null),
  rawText: nullableString,
  notes: nullableString.default(null),
});

export function parseAnalysisResult(input: unknown): AnalysisResult {
  return analysisResultSchema.parse(preprocessAnalysisJson(input)) as AnalysisResult;
}

export function safeParseAnalysisResult(input: unknown) {
  return analysisResultSchema.safeParse(preprocessAnalysisJson(input));
}

export const LOW_CONFIDENCE_THRESHOLD = 0.7;
