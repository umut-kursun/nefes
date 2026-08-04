import { z } from "zod";
import { applyMigrosDiscountLines } from "../vision/applyMigrosDiscountLines";
import { applyProductLineVatRates } from "../vision/applyProductLineVatRate";
import { bindUpperLineQuantities } from "../vision/bindUpperLineQuantities";
import { disambiguatePosFooter } from "../vision/disambiguatePosFooter";
import { coerceRawVisionOutput } from "../vision/coerceRawVisionOutput";
import { mergeStandaloneMultiplierProducts } from "../vision/mergeStandaloneMultiplierProducts";
import { normalizeVisionReceipt } from "../vision/normalizeVisionReceipt";
import { postProcessParsedReceipt } from "../vision/parsedReceiptPostProcess";
import { reconcileParsedReceiptTotals } from "../vision/parsedReceiptReconcile";
import { applyPlatformOrderSanitization } from "../vision/sanitizePlatformOrderItems";
import { validateParsedReceiptMath } from "../vision/parsedReceiptValidation";

export const TR_VAT_RATES = [1, 8, 10, 18, 20] as const;

export const receiptItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.union([z.number().positive(), z.null()]).optional(),
  unit: z.string().nullable().optional(),
  unitPrice: z.number().nonnegative().optional(),
  lineTotal: z.number().nonnegative(),
  vatRatePercentage: z.union([
    z.literal(1),
    z.literal(8),
    z.literal(10),
    z.literal(18),
    z.literal(20),
    z.null(),
  ]).optional(),
  category: z.string().optional(),
  /** Normalized pricing base: L, kg, or ad. */
  baseUnit: z.enum(["L", "kg", "ad"]).optional(),
  /** Comparable unit price in TL per baseUnit. */
  normalizedUnitPrice: z.number().nonnegative().optional(),
  /** Pack size token from product name, e.g. "330ml", "500g". */
  variantSize: z.string().nullable().optional(),
  /** Disambiguated product identity key (name + variant). */
  productKey: z.string().optional(),
});

export const paymentInfoSchema = z.object({
  type: z.enum(["CREDIT_CARD", "CASH", "OTHER"]),
  bankName: z.string().nullable().optional(),
  cardLastFour: z.string().nullable().optional(),
  approvalCode: z.string().nullable().optional(),
  amount: z.number().nonnegative(),
});

/** Receipt-level discount (Migros % İNDİRİM, kupon, kampanya) — separate from products[]. */
export const discountInfoSchema = z.object({
  name: z.string().min(1),
  /** Discount amount — negative on receipt (e.g. -57.49 for *-57,49). */
  amount: z.number().refine((n) => n !== 0, { message: "discount amount required" }),
  vatRatePercentage: z.union([
    z.literal(1),
    z.literal(8),
    z.literal(10),
    z.literal(18),
    z.literal(20),
    z.null(),
  ]).optional(),
  /** Product name the discount applies to, when visually bound below a row. */
  linkedProductName: z.string().nullable().optional(),
});

export const parsedReceiptSchema = z.object({
  merchant: z.object({
    title: z.string().min(1),
    vknTckn: z.string().nullable().optional(),
    taxOffice: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    category: z.enum([
      "RESTAURANT",
      "MARKET",
      "FUEL",
      "PHARMACY",
      "RETAIL",
      "OTHER",
    ]),
  }),
  metadata: z.object({
    purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    purchaseTime: z.string().nullable().optional(),
    receiptNumber: z.string().nullable().optional(),
    currency: z.string().default("TRY"),
  }),
  products: z.array(receiptItemSchema).min(1),
  discounts: z.array(discountInfoSchema).default([]),
  payments: z.array(paymentInfoSchema).default([]),
  financials: z.object({
    subtotal: z.number().nullable().optional(),
    vatTotal: z.number().nullable().optional(),
    discountTotal: z.number().nullable().optional(),
    totalAmount: z.number().nonnegative(),
  }),
  fuelDetails: z
    .object({
      plateNumber: z.string().nullable().optional(),
      pumpNumber: z.number().nullable().optional(),
      liters: z.number().nullable().optional(),
      pricePerLiter: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  rawText: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type ReceiptItem = z.infer<typeof receiptItemSchema>;
export type PaymentInfo = z.infer<typeof paymentInfoSchema>;
export type DiscountInfo = z.infer<typeof discountInfoSchema>;
export type ParsedReceiptCharge = {
  name: string;
  amount: number;
  quantity?: number | null;
};
export type ParsedReceipt = z.infer<typeof parsedReceiptSchema> & {
  /** Delivery/service fees split from digital platform order tables. */
  platformCharges?: ParsedReceiptCharge[];
  /** False when SUM(products) ≠ financials.totalAmount (±tolerance). */
  mathConsistent?: boolean;
};

export function parseParsedReceiptJson(raw: unknown): ParsedReceipt {
  const coerced = coerceRawVisionOutput(raw) as Record<string, unknown>;
  const result = parsedReceiptSchema.safeParse(coerced);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Vision JSON schema validation failed: ${detail}`);
  }
  const chargesRaw = Array.isArray(coerced.charges) ? coerced.charges : [];
  const platformCharges = chargesRaw
    .map((c) => {
      if (c == null || typeof c !== "object") return null;
      const row = c as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const amount =
        typeof row.amount === "number" && Number.isFinite(row.amount)
          ? Math.abs(row.amount)
          : null;
      if (!name || amount == null) return null;
      return { name, amount };
    })
    .filter((c): c is ParsedReceiptCharge => c != null);

  return {
    ...result.data,
    ...(platformCharges.length > 0 ? { platformCharges } : {}),
  };
}

/**
 * Vision-first finalize — delegates to unified normalizeVisionReceipt pipeline.
 * @see normalizeVisionReceipt
 */
export function finalizeVisionParsedReceipt(parsed: ParsedReceipt): ParsedReceipt {
  return normalizeVisionReceipt(parsed);
}

/** @deprecated Legacy OCR path — only runs when parserMode is explicitly `ocr_then_deterministic`. */
export function finalizeParsedReceipt(parsed: ParsedReceipt): ParsedReceipt {
  const merged = mergeStandaloneMultiplierProducts(parsed);
  const vatApplied = applyProductLineVatRates(merged);
  const bound = bindUpperLineQuantities(vatApplied);
  const discounted = applyMigrosDiscountLines(bound);
  const sanitized = applyPlatformOrderSanitization(discounted);
  const footerFixed = disambiguatePosFooter(sanitized);
  const reconciled = reconcileParsedReceiptTotals(postProcessParsedReceipt(footerFixed));
  const math = validateParsedReceiptMath(reconciled);
  return { ...reconciled, mathConsistent: math.ok };
}
