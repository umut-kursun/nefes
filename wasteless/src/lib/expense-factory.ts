import type {
  AnalysisItem,
  AnalysisResult,
  Expense,
  ReceiptItem,
  SourceType,
  UserCategory,
} from "@/lib/types";
import {
  isCigaretteCategory,
  isFuelCategory,
  mapAiCategoryToUserCategory,
} from "@/lib/categories";
import { isTobaccoItem } from "@/lib/tobacco-memory";
import { normalizeTime } from "@/lib/datetime";
import { cleanMerchantName } from "@/lib/receipt-engine-sdk/normalize/cleanMerchantName";
import { normalizeMerchantName } from "@/lib/merchants";
import { formatPlate, normalizePlate } from "@/lib/plate";
import { computeUnitPrice, normalizeProductName, resolvePurchaseQuantity } from "@/lib/products";
import { displayProductName } from "@/lib/product-name-cleaner";
import { analysisHasCorruptedPrices } from "@/lib/receipt-quality";
import { createId, todayISO } from "@/lib/utils";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { PurchaseLine } from "@/lib/receipt-engine/types/models/purchase";
import {
  FUEL_QUANTITY_LINE,
  FUEL_UNIT_PRICE,
  PLATE_HINT,
  TOPKDV_HINT,
} from "@/lib/receipt-engine/patterns/document";
import type { FuelDetails } from "@/lib/types";
import {
  ChargeType,
  DiscountType,
  PaymentType,
  normalizeChargeLine,
  normalizeDiscountLine,
  normalizePaymentLine,
} from "@/lib/receipt-model";
import { classifyReceiptCharge, isReceiptDiscountLine } from "@/lib/receipt-charges";
import { parseMultiplierText } from "@/lib/receipt-engine-sdk/vision/mergeStandaloneMultiplierProducts";

const FUEL_PRODUCT = /\b(motorin|benzin|dizel|lpg|fuel|akaryak[iı]t)\b/i;

const NON_PRODUCT_LINE =
  /\b(topkdv|top\s*kdv|kdv\s*toplam|toplam|genel\s*toplam|ara\s*toplam|nakit|kredi\s*kart|ortak\s*pos|banka\s*kart|visa|mastercard|aid:|pos\s*no)\b/i;

function parseTrNumber(raw: string): number | undefined {
  const normalized = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function parseFuelUnitPriceFromText(text: string): number | undefined {
  const match = text.match(FUEL_UNIT_PRICE);
  if (!match?.[1]) return undefined;
  return parseTrNumber(match[1]);
}

function parseFuelLitersFromText(text: string): number | undefined {
  const match = text.match(FUEL_QUANTITY_LINE);
  if (!match?.[1]) return undefined;
  const raw = match[1];
  if (/^\d+,\d{3}$/.test(raw)) return Number(raw.replace(",", "."));
  return parseTrNumber(raw);
}

function extractPlateFromSources(...sources: (string | null | undefined)[]): string | null {
  for (const src of sources) {
    if (!src?.trim()) continue;
    for (const line of src.split(/\r?\n/)) {
      const trimmed = line.trim();
      const spaced = trimmed.match(PLATE_HINT);
      if (spaced?.[1]) return spaced[1];
      const compact = trimmed.match(/^(\d{2}[A-Za-zÇĞİÖŞÜçğıöşü]{1,3}\d{2,5})$/);
      if (compact?.[1]) return compact[1];
    }
  }
  return null;
}

function isNonProductPurchaseLine(line: PurchaseLine): boolean {
  const name = line.name.trim();
  const blob = [
    line.name,
    ...line.provenance.rawTexts,
    ...line.provenance.ocrTexts,
  ]
    .join(" ")
    .trim();
  if (!blob) return true;
  if (TOPKDV_HINT.test(blob)) return true;
  if (NON_PRODUCT_LINE.test(blob) && !FUEL_PRODUCT.test(blob)) return true;
  if (PLATE_HINT.test(name) && line.lineTotal == null) return true;
  if (isReceiptDiscountLine(name)) return true;
  if (/%/.test(name) && /İNDİRİM|INDIRIM/i.test(name)) return true;
  if (line.lineTotal != null && line.lineTotal < 0) return true;
  if (parseMultiplierText(name)) return true;
  if (/TL\/AD/i.test(name)) return true;
  if (/^\d+(?:[.,]\d+)?\s*AD\b/i.test(name)) return true;
  return false;
}

function hasFuelQuantityEvidence(
  purchase: PurchaseDraft,
  ocrRawText: string | null
): boolean {
  const blob = [
    ocrRawText ?? "",
    ...purchase.products.map((p) => p.name),
    ...purchase.products.flatMap((p) => p.provenance.rawTexts),
  ].join("\n");
  if (FUEL_QUANTITY_LINE.test(blob)) return true;
  return purchase.products.some(
    (p) =>
      FUEL_PRODUCT.test(p.name) &&
      p.quantity != null &&
      (p.unit?.toUpperCase().startsWith("L") ?? false)
  );
}

const TOBACCO_MERCHANT = /\b(tekel|tütün|tutun)\b/i;

function isTobaccoPurchaseLine(line: PurchaseLine): boolean {
  const blob = [
    line.name,
    ...line.provenance.rawTexts,
    ...line.provenance.ocrTexts,
  ].join(" ");
  return isTobaccoItem(blob);
}

function hasTobaccoEvidence(
  purchase: PurchaseDraft,
  ocrRawText: string | null
): boolean {
  const haystack = [
    purchase.merchant ?? "",
    ocrRawText ?? "",
    ...purchase.provenance.rawTexts,
  ]
    .join("\n")
    .toLowerCase();

  if (TOBACCO_MERCHANT.test(haystack)) return true;

  return purchase.products.some((p) => isTobaccoPurchaseLine(p));
}

function sumTobaccoPackCount(lines: PurchaseLine[]): number {
  return lines
    .filter((line) => isTobaccoPurchaseLine(line))
    .reduce((sum, line) => sum + Math.max(line.quantity ?? 1, 1), 0);
}

function inferCategoryFromPurchase(
  purchase: PurchaseDraft,
  categories: UserCategory[],
  hasFuel: boolean,
  ocrRawText: string | null
): string {
  const fuelEvidence = hasFuel && hasFuelQuantityEvidence(purchase, ocrRawText);
  if (fuelEvidence) {
    const fuelCat =
      categories.find((c) => isFuelCategory(c)) ??
      categories.find((c) => c.id === "akaryakit");
    if (fuelCat) return fuelCat.id;
  }

  if (hasTobaccoEvidence(purchase, ocrRawText)) {
    const tobaccoCat =
      categories.find((c) => isCigaretteCategory(c)) ??
      categories.find((c) => c.id === "sigara");
    if (tobaccoCat) return tobaccoCat.id;
  }

  const haystack = [
    purchase.merchant ?? "",
    ocrRawText ?? "",
    ...purchase.provenance.rawTexts,
  ]
    .join("\n")
    .toLowerCase();

  const rules: Array<{ pattern: RegExp; id: string }> = [
    { pattern: /\b(mepet|metro\s*petrol|metropetrol)\b/i, id: "market" },
    { pattern: /\bopet\s*market\b/i, id: "market" },
    { pattern: /\b(shell|bp\b|turcas|petrolculuk|akaryak[iı]t|petrol)\b/i, id: "akaryakit" },
    { pattern: /\bopet\b/i, id: "market" },
    { pattern: /\b(migros|bim\b|a101|carrefour|sok\b|macrocenter|marketler)\b/i, id: "market" },
    {
      pattern:
        /\b(starbucks|cafe|kafe|restoran|restaurant|lezzet|burger|mcdonald|yemek|profiterol|profiterol|tatli|tatlı|pastane|dondurma|börek|borek|waffle|kurabiye|tatlı\s*börek)\b/i,
      id: "yeme_icme",
    },
    { pattern: /\b(eczane|pharmacy)\b/i, id: "saglik" },
    { pattern: /\b(waikiki|lcw|giyim|clothing|magazacilik)\b/i, id: "giyim" },
    { pattern: /\b(ispark|otopark|parking)\b/i, id: "araba_otopark" },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(haystack)) {
      const found = categories.find((c) => c.id === rule.id);
      if (found) return found.id;
    }
  }

  return (
    categories.find((c) => c.id === "market")?.id ??
    categories.find((c) => c.id === "other")?.id ??
    categories[0]?.id ??
    "other"
  );
}

function extractFuelFromPurchase(
  purchase: PurchaseDraft,
  ocrRawText: string | null
): FuelDetails | null {
  const fuelLine = purchase.products.find(
    (p) => FUEL_PRODUCT.test(p.name) || FUEL_PRODUCT.test(p.provenance.rawTexts.join(" "))
  );
  if (!fuelLine) return null;

  const label = fuelLine.name || fuelLine.provenance.rawTexts.join(" ");
  const fuelTypeMatch = label.match(FUEL_PRODUCT);
  const fuelType = fuelTypeMatch?.[1]
    ? fuelTypeMatch[1].charAt(0).toUpperCase() +
      fuelTypeMatch[1].slice(1).toLowerCase()
    : null;

  const rawBlob = [
    label,
    ...fuelLine.provenance.rawTexts,
    ...fuelLine.provenance.ocrTexts,
    ocrRawText ?? "",
  ].join("\n");

  const liters =
    fuelLine.quantity != null && fuelLine.unit?.toUpperCase().startsWith("L")
      ? fuelLine.quantity
      : (fuelLine.quantity ?? parseFuelLitersFromText(rawBlob) ?? null);

  let pricePerLiter =
    fuelLine.unitPrice ?? parseFuelUnitPriceFromText(rawBlob) ?? null;

  if (pricePerLiter == null && liters != null && liters > 0 && fuelLine.lineTotal != null) {
    pricePerLiter = Math.round((fuelLine.lineTotal / liters) * 100) / 100;
  }

  const plateRaw = extractPlateFromSources(
    ocrRawText,
    purchase.provenance.rawTexts.join("\n"),
    rawBlob
  );

  return {
    fuelType,
    liters,
    pricePerLiter,
    stationName: purchase.merchant?.trim() || null,
    odometer: null,
    plate: formatPlate(plateRaw) ?? normalizePlate(plateRaw),
  };
}

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

function mergeFuelMetadata(
  fromProducts: FuelDetails | null,
  fromPurchase: import("@/lib/receipt-engine/types/models/purchase").PurchaseFuelMetadata | null
): FuelDetails | null {
  if (!fromProducts && !fromPurchase) return null;
  const plateRaw =
    fromPurchase?.plateNumber ??
    fromProducts?.plate ??
    null;
  return {
    fuelType: fromPurchase?.fuelType ?? fromProducts?.fuelType ?? null,
    liters: fromPurchase?.liters ?? fromProducts?.liters ?? null,
    pricePerLiter:
      fromPurchase?.pricePerLiter ?? fromProducts?.pricePerLiter ?? null,
    stationName:
      fromPurchase?.stationName ?? fromProducts?.stationName ?? null,
    odometer: fromProducts?.odometer ?? null,
    plate: formatPlate(plateRaw) ?? normalizePlate(plateRaw),
  };
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
  const purchaseQty = resolvePurchaseQuantity({
    quantity: item.quantity,
    unit: item.unit,
    name: cleaned,
  });
  return {
    id: createId("item"),
    expenseId,
    name: cleaned,
    normalizedName: normalizeProductName(cleaned),
    quantity: purchaseQty.quantity,
    unit: purchaseQty.unit,
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
    merchantName: normalizeMerchantName(cleanMerchantName(merchantRaw)) ?? normalizeMerchantName(merchantRaw),
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
    confidence: null,
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

  const ocrRawText =
    (options.ocrRawText?.trim() ||
      purchase.provenance.rawTexts.filter(Boolean).join("\n").trim() ||
      "") ||
    null;

  const fuel = extractFuelFromPurchase(purchase, ocrRawText);
  const mergedFuel = mergeFuelMetadata(fuel, purchase.fuel ?? null);
  const hasFuel =
    mergedFuel != null &&
    (purchase.fuel != null ||
      hasFuelQuantityEvidence(purchase, ocrRawText)) &&
    (mergedFuel.liters != null ||
      mergedFuel.pricePerLiter != null ||
      mergedFuel.fuelType != null ||
      mergedFuel.plate != null ||
      mergedFuel.stationName != null);

  const category = inferCategoryFromPurchase(purchase, categories, hasFuel, ocrRawText);
  const tobaccoCategoryId =
    categories.find((c) => isCigaretteCategory(c))?.id ??
    categories.find((c) => c.id === "sigara")?.id ??
    category;

  const productLines = purchase.products.filter((line) => !isNonProductPurchaseLine(line));
  const linesForItems = hasFuel
    ? productLines.filter(
        (line) =>
          FUEL_PRODUCT.test(line.name) ||
          FUEL_PRODUCT.test(line.provenance.rawTexts.join(" ")) ||
          FUEL_PRODUCT.test(line.provenance.ocrTexts.join(" "))
      )
    : productLines;

  const items: ReceiptItem[] = linesForItems.map((line) => {
    const rawLine =
      line.provenance.ocrTexts.filter(Boolean).join(" ").trim() ||
      line.provenance.rawTexts.filter(Boolean).join(" ").trim() ||
      line.name;
    const cleaned = displayProductName(line.name || rawLine);
    const fuelNameMatch = cleaned.match(FUEL_PRODUCT);
    const displayName =
      hasFuel && fuelNameMatch?.[1]
        ? fuelNameMatch[1].charAt(0).toUpperCase() + fuelNameMatch[1].slice(1).toLowerCase()
        : cleaned;
    const unitInfo = computeUnitPrice({
      totalPrice: line.lineTotal,
      quantity: line.quantity,
      unit: line.unit,
      name: displayName,
      existingUnitPrice: line.normalizedUnitPrice ?? line.unitPrice ?? mergedFuel?.pricePerLiter ?? undefined,
    });
    const purchaseQty = resolvePurchaseQuantity({
      quantity: line.quantity,
      unit: line.unit,
      name: displayName,
    });
    const isTobacco = isTobaccoPurchaseLine(line);
    return {
      id: createId("item"),
      expenseId,
      name: displayName,
      normalizedName: normalizeProductName(displayName),
      quantity:
        hasFuel && mergedFuel?.liters != null
          ? mergedFuel.liters
          : purchaseQty.quantity,
      unit:
        hasFuel && mergedFuel?.liters != null
          ? "LT"
          : purchaseQty.unit,
      unitPrice: line.normalizedUnitPrice ?? unitInfo.unitPrice ?? line.unitPrice ?? mergedFuel?.pricePerLiter ?? null,
      normalizedUnitPrice: line.normalizedUnitPrice ?? unitInfo.unitPrice ?? null,
      baseUnit: line.baseUnit ?? null,
      variantSize: line.variantSize ?? null,
      productKey: line.productKey ?? null,
      totalPrice: line.lineTotal ?? null,
      categoryGuess: isTobacco ? tobaccoCategoryId : category,
      rawText: rawLine || cleaned || null,
      confidence: line.confidence ?? null,
    };
  });

  const charges = purchase.charges
    .filter((c) => classifyReceiptCharge(c.label) != null)
    .map((c) =>
      normalizeChargeLine({
        label: c.label,
        amount: c.amount ?? 0,
        type: classifyReceiptCharge(c.label) ?? ChargeType.Other,
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
    merchantName: normalizeMerchantName(cleanMerchantName(merchantRaw)) ?? normalizeMerchantName(merchantRaw),
    merchantRaw,
    category,
    subcategory: hasFuel ? resolveFuelSubcategory(mergedFuel, null) : null,
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
    fuel: mergedFuel,
    packCount: (() => {
      const tobaccoPacks = sumTobaccoPackCount(productLines);
      if (tobaccoPacks > 0) return tobaccoPacks;
      return items.length || null;
    })(),
    quickButtonId: null,
    items,
    charges,
    discounts,
    payments,
    unknownLines: [],
  };
}
