import type {
  AnalysisItem,
  AnalysisResult,
  Expense,
  ReceiptItem,
  SourceType,
  UserCategory,
} from "@/lib/types";
import { mapAiCategoryToUserCategory } from "@/lib/categories";
import { normalizeTime } from "@/lib/datetime";
import { normalizeMerchantName } from "@/lib/merchants";
import { formatPlate, normalizePlate } from "@/lib/plate";
import { computeUnitPrice, normalizeProductName } from "@/lib/products";
import { displayProductName } from "@/lib/product-name-cleaner";
import { analysisHasCorruptedPrices } from "@/lib/receipt-quality";
import { createId, todayISO } from "@/lib/utils";
import { isFuelCategory } from "@/lib/categories";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import {
  ChargeType,
  DiscountType,
  PaymentType,
  normalizeChargeLine,
  normalizeDiscountLine,
  normalizePaymentLine,
} from "@/lib/receipt-model";

function resolveFuelSubcategory(
  fuel: AnalysisResult["fuel"],
  existing: string | null | undefined
): string | null {
  const fuelType = fuel?.fuelType?.trim();
  if (fuelType) return fuelType;
  if (existing?.trim()) return existing.trim();
  if (fuel) return "Benzin";
  return null;
}

export function enrichItem(
  item: AnalysisItem,
  expenseId: string,
  category: string
): ReceiptItem {
  const rawName = item.name ?? "";
  const cleaned = displayProductName(rawName);
  const ocrLine = item.ocrName ?? rawName;
  const totalPrice = item.totalPrice;
  const unitInfo = computeUnitPrice({
    totalPrice,
    quantity: item.quantity,
    unit: item.unit,
    name: cleaned,
    existingUnitPrice: item.unitPrice,
  });
  return {
    id: createId("item"),
    expenseId,
    name: cleaned,
    normalizedName: normalizeProductName(cleaned),
    quantity: item.quantity != null && item.quantity > 0
      ? item.quantity
      : (unitInfo.packAmount ?? 1),
    unit: item.unit ?? unitInfo.packUnit,
    unitPrice: unitInfo.unitPrice ?? item.unitPrice,
    totalPrice,
    categoryGuess: category,
    rawText: ocrLine || cleaned || null,
    confidence: item.confidence ?? null,
  };
}

export function createEmptyItem(expenseId: string, category: string): ReceiptItem {
  return {
    id: createId("item"),
    expenseId,
    name: "",
    normalizedName: null,
    quantity: 1,
    unit: null,
    unitPrice: null,
    totalPrice: null,
    categoryGuess: category,
    rawText: null,
    confidence: null,
  };
}

export function analysisToExpenseDraft(
  rawAnalysis: AnalysisResult,
  imageDataUrl: string | null = null,
  aiResponseJson: string | null = null,
  categories: UserCategory[] = []
): Expense {
  // Pipeline already ran receipt intelligence + product reconstruction.
  const analysis = rawAnalysis;

  const expenseId = createId("exp");
  const now = new Date().toISOString();
  const merchantRaw = analysis.merchantName;
  let category = mapAiCategoryToUserCategory(analysis.category, categories);

  const hasFuel =
    !!analysis.fuel &&
    (analysis.fuel.liters != null ||
      analysis.fuel.pricePerLiter != null ||
      analysis.fuel.fuelType != null ||
      analysis.fuel.plate != null ||
      analysis.fuel.stationName != null);
  if (hasFuel) {
    const fuelCat =
      categories.find((c) => isFuelCategory(c)) ??
      categories.find((c) => c.id === "akaryakit");
    if (fuelCat) category = fuelCat.id;
  }

  const fuel = analysis.fuel
    ? {
        fuelType: analysis.fuel.fuelType,
        liters: analysis.fuel.liters,
        pricePerLiter: analysis.fuel.pricePerLiter,
        stationName: null,
        odometer: null,
        plate:
          formatPlate(analysis.fuel.plate) ??
          normalizePlate(analysis.fuel.plate),
      }
    : null;

  const itemsSource = analysisHasCorruptedPrices(analysis)
    ? []
    : analysis.items || [];

  const items: ReceiptItem[] = itemsSource.map((item) =>
    enrichItem(item, expenseId, category)
  );

  let confidence = analysis.confidence;
  if (analysisHasCorruptedPrices(analysis)) {
    confidence = Math.min(confidence, 0.45);
  }

  return {
    id: expenseId,
    sourceType: analysis.sourceType,
    date: analysis.date || todayISO(),
    time: normalizeTime(analysis.time),
    merchantName: normalizeMerchantName(merchantRaw),
    merchantRaw,
    category,
    subcategory: hasFuel
      ? resolveFuelSubcategory(fuel, analysis.subCategory)
      : analysis.subCategory?.trim() || null,
    tagIds: [],
    totalAmount: analysis.totalAmount ?? 0,
    currency: analysis.currency || "TRY",
    notes: analysis.notes,
    createdAt: now,
    updatedAt: now,
    rawText: analysis.rawText,
    confidence,
    imageDataUrl,
    aiResponseJson,
    fuel,
    packCount: analysis.packCount,
    quickButtonId: null,
    items,
    charges: analysis.charges ?? [],
    discounts: analysis.discounts ?? [],
    payments: analysis.payments ?? [],
    unknownLines: analysis.unknownLines ?? [],
  };
}

export function createManualExpense(partial?: Partial<Expense>): Expense {
  const now = new Date().toISOString();
  const raw = partial?.merchantRaw ?? partial?.merchantName ?? null;
  return {
    id: createId("exp"),
    sourceType: (partial?.sourceType as SourceType) || "manual",
    date: partial?.date || todayISO(),
    time: partial?.time ?? null,
    merchantName: normalizeMerchantName(partial?.merchantName ?? raw),
    merchantRaw: raw,
    category: partial?.category || "other",
    subcategory: partial?.subcategory ?? null,
    tagIds: partial?.tagIds ?? [],
    totalAmount: partial?.totalAmount ?? 0,
    currency: partial?.currency || "TRY",
    notes: partial?.notes ?? null,
    createdAt: now,
    updatedAt: now,
    rawText: null,
    confidence: 1,
    imageDataUrl: null,
    aiResponseJson: null,
    fuel: partial?.fuel ?? null,
    packCount: partial?.packCount ?? null,
    quickButtonId: null,
    items: partial?.items ?? [],
    charges: partial?.charges ?? [],
    discounts: partial?.discounts ?? [],
    payments: partial?.payments ?? [],
    unknownLines: partial?.unknownLines ?? [],
  };
}

/**
 * Map Receipt Engine PurchaseDraft → editable Expense draft for Add/Review.
 * Preserves verbatim OCR on expense.rawText and each item.rawText.
 */
export function purchaseDraftToExpenseDraft(
  purchase: PurchaseDraft,
  options: {
    imageDataUrl?: string | null;
    ocrRawText?: string | null;
    categories?: UserCategory[];
    /** Structured parser output JSON (PurchaseDraft ± validation). */
    parserJson?: string | null;
  } = {}
): Expense {
  const expenseId = createId("exp");
  const now = new Date().toISOString();
  const categories = options.categories ?? [];
  const merchantRaw = purchase.merchant?.trim() || null;
  const category =
    categories.find((c) => c.id === "market")?.id ??
    categories.find((c) => c.id === "other")?.id ??
    categories[0]?.id ??
    "other";

  const ocrRawText =
    (options.ocrRawText?.trim() ||
      purchase.provenance.rawTexts.filter(Boolean).join("\n").trim() ||
      "") ||
    null;

  const items: ReceiptItem[] = purchase.products.map((line) => {
    const rawLine =
      line.provenance.ocrTexts.filter(Boolean).join(" ").trim() ||
      line.provenance.rawTexts.filter(Boolean).join(" ").trim() ||
      line.name;
    const cleaned = displayProductName(line.name || rawLine);
    const unitInfo = computeUnitPrice({
      totalPrice: line.lineTotal,
      quantity: line.quantity,
      unit: line.unit,
      name: cleaned,
      existingUnitPrice: line.unitPrice,
    });
    return {
      id: createId("item"),
      expenseId,
      name: cleaned,
      normalizedName: normalizeProductName(cleaned),
      quantity:
        line.quantity != null && line.quantity > 0
          ? line.quantity
          : (unitInfo.packAmount ?? 1),
      unit: line.unit ?? unitInfo.packUnit ?? null,
      unitPrice: unitInfo.unitPrice ?? line.unitPrice ?? null,
      totalPrice: line.lineTotal ?? null,
      categoryGuess: category,
      rawText: rawLine || cleaned || null,
      confidence: line.confidence ?? null,
    };
  });

  const charges = purchase.charges.map((c) =>
    normalizeChargeLine({
      label: c.label,
      amount: c.amount ?? 0,
      type: ChargeType.Other,
    })
  );
  const discounts = purchase.discounts.map((d) =>
    normalizeDiscountLine({
      label: d.label,
      amount: d.amount ?? 0,
      type: DiscountType.Other,
    })
  );
  const payments = purchase.payments.map((p) =>
    normalizePaymentLine({
      label: p.label,
      amount: p.amount ?? null,
      type: PaymentType.Other,
    })
  );

  return {
    id: expenseId,
    sourceType: "receipt",
    date: purchase.purchaseDate?.normalized || purchase.purchaseDate?.raw || todayISO(),
    time: normalizeTime(
      purchase.purchaseTime?.normalized || purchase.purchaseTime?.raw || null
    ),
    merchantName: normalizeMerchantName(merchantRaw),
    merchantRaw,
    category,
    subcategory: null,
    tagIds: [],
    totalAmount: purchase.total?.amount ?? 0,
    currency: purchase.currency?.normalized || purchase.currency?.raw || "TRY",
    notes: null,
    createdAt: now,
    updatedAt: now,
    rawText: ocrRawText,
    confidence: purchase.confidence ?? null,
    imageDataUrl: options.imageDataUrl ?? null,
    aiResponseJson:
      options.parserJson?.trim() ||
      JSON.stringify(purchase, null, 2),
    fuel: null,
    packCount: items.length || null,
    quickButtonId: null,
    items,
    charges,
    discounts,
    payments,
    unknownLines: [],
  };
}
