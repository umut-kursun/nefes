/**
 * Column-aware Turkish receipt line parser.
 * Reconstructs product lines from OCR raw text:
 *   Product Name | %VAT | Line Total
 * Non-product lines are classified — never silently discarded.
 */

import type { AnalysisItem } from "@/lib/types";
import type { ChargeLine, DiscountLine, PaymentLine, UnknownLine } from "@/lib/receipt-model";
import { appendCharge } from "@/lib/receipt-charges";
import { parseMoney } from "@/lib/money";
import { cleanProductName } from "@/lib/product-name-cleaner";
import { isReceiptChargeLine } from "@/lib/receipt-charges";
import {
  classifyReceiptLine,
  formatClassificationLog,
  type ClassificationLogEntry,
} from "@/lib/receipt-line-classifier";
import {
  emptyReceiptLineBuckets,
  routeClassifiedLine,
  type ReceiptLineBuckets,
} from "@/lib/receipt-line-routing";

const VAT_INLINE = /%(?:\s*)(\d{1,2})(?:[.,]\d+)?/g;
const VAT_STANDALONE = /^%?\s*\d{1,2}(?:[.,]\d+)?\s*%?$/;
const X_TOTAL = /^x\s*(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2}|\d+)$/i;
const MONEY_TAIL =
  /(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2})\s*(?:tl|₺)?$/i;
const PRODUCT_COUNT =
  /(?:toplam\s*)?(?:ürün|urun)\s*(?:adedi|adet|sayısı|sayisi)\s*[:=]?\s*(\d{1,3})/i;
const FOOTER_HINT =
  /\b(toplam|kdv|ödenecek|odenecek|nakit|kart|para\s*üstü|teşekkür|tesekkur|fiş\s*no|fis\s*no|z\s*no|mali\s*değer|mali\s*deger|vk[nıi]|vergi\s*no)\b/i;
const HEADER_HINT =
  /\b(limited|ltd|a\.?\s*ş\.?|aş|ticaret|sanayi|vergi\s*daire|vd\.?|tel|www\.|http)\b/i;

export type ParsedReceiptLine = {
  name: string;
  vatRate: number | null;
  totalPrice: number | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  raw: string;
};

export type StructuralParseResult = {
  items: AnalysisItem[];
  charges: ChargeLine[];
  discounts: DiscountLine[];
  payments: import("@/lib/receipt-model").PaymentLine[];
  unknownLines: import("@/lib/receipt-model").UnknownLine[];
  classificationLog: ClassificationLogEntry[];
};

const WEIGHTED_LINE =
  /(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gram|ml|lt|l|litre|adet)\s*(?:x|×|\*|@|:)?\s*(\d+(?:[.,]\d+)?)/i;

function parseWeightedFromLine(line: string): {
  cleaned: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
} | null {
  const m = line.match(WEIGHTED_LINE);
  if (!m) return null;
  const quantity = Number(m[1]!.replace(",", "."));
  const unitRaw = m[2]!.toLowerCase();
  const unitPrice = Number(m[3]!.replace(",", "."));
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return null;
  let unit: string | null = unitRaw;
  if (unitRaw === "gr" || unitRaw === "gram") unit = "g";
  if (unitRaw === "lt" || unitRaw === "litre") unit = "l";
  const cleaned = line.replace(m[0]!, " ").replace(/\s+/g, " ").trim();
  return { cleaned, quantity, unit, unitPrice };
}

export function detectDeclaredProductCount(
  rawText: string | null | undefined
): number | null {
  if (!rawText) return null;
  const m = rawText.match(PRODUCT_COUNT);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 && n < 500 ? n : null;
}

function isHardNoiseLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length < 2) return true;
  if (/^\d{8,}$/.test(t.replace(/\s/g, ""))) return true;
  if (/^\*+$/.test(t)) return true;
  return false;
}

function extractVat(line: string): { cleaned: string; vat: number | null } {
  let vat: number | null = null;
  const cleaned = line.replace(VAT_INLINE, (_, digits: string) => {
    const n = Number(digits);
    if (Number.isFinite(n)) vat = n;
    return " ";
  });
  return { cleaned: cleaned.replace(/\s+/g, " ").trim(), vat };
}

function extractTrailingMoney(line: string): {
  cleaned: string;
  amount: number | null;
} {
  const m = line.match(MONEY_TAIL);
  if (!m) return { cleaned: line, amount: null };
  const amount = parseMoney(m[1]);
  if (amount == null || amount <= 0) return { cleaned: line, amount: null };
  const cleaned = line.slice(0, m.index).trim();
  return { cleaned, amount };
}

function extractAmountFromRaw(rawLine: string): number | null {
  const money = extractTrailingMoney(rawLine.replace(/\u00a0/g, " ").trim());
  if (money.amount != null) return money.amount;
  const xOnly = rawLine.match(X_TOTAL);
  if (xOnly) return parseMoney(xOnly[1]);
  return null;
}

export function parseReceiptProductLine(rawLine: string): ParsedReceiptLine | null {
  let line = rawLine.replace(/\u00a0/g, " ").trim();
  if (!line || isHardNoiseLine(line)) return null;

  let weightedQty: number | null = null;
  let weightedUnit: string | null = null;
  let weightedUnitPrice: number | null = null;
  const weighted = parseWeightedFromLine(line);
  if (weighted) {
    line = weighted.cleaned;
    weightedQty = weighted.quantity;
    weightedUnit = weighted.unit;
    weightedUnitPrice = weighted.unitPrice;
  }

  const xOnly = line.match(X_TOTAL);
  if (xOnly && line.replace(X_TOTAL, "").trim().length === 0) {
    return null;
  }

  let quantity: number | null = null;
  let totalPrice: number | null = null;

  const xEmbed = line.match(/\bx\s*(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2})\b/i);
  if (xEmbed) {
    const asMoney = parseMoney(xEmbed[1]);
    if (asMoney != null && /[,.]\d{2}$/.test(xEmbed[1]!.replace(/\s/g, ""))) {
      totalPrice = asMoney;
      line = line.replace(xEmbed[0]!, " ").replace(/\s+/g, " ").trim();
    } else if (asMoney != null && asMoney > 0 && asMoney < 100 && Number.isInteger(asMoney)) {
      quantity = asMoney;
      line = line.replace(xEmbed[0]!, " ").replace(/\s+/g, " ").trim();
    } else if (asMoney != null && asMoney >= 100) {
      totalPrice = asMoney;
      line = line.replace(xEmbed[0]!, " ").replace(/\s+/g, " ").trim();
    }
  }

  const vatInfo = extractVat(line);
  line = vatInfo.cleaned;
  if (VAT_STANDALONE.test(line)) return null;

  if (totalPrice == null) {
    const money = extractTrailingMoney(line);
    if (money.amount != null) {
      totalPrice = money.amount;
      line = money.cleaned;
    }
  }

  const qtyMatch = line.match(/\bx\s*(\d{1,3})\b/i);
  if (qtyMatch && quantity == null) {
    quantity = Number(qtyMatch[1]);
    line = line.replace(qtyMatch[0]!, " ").replace(/\s+/g, " ").trim();
  }

  const name = cleanProductName(line);
  if (!name || name.length < 2) return null;

  if (isReceiptChargeLine(name)) {
    if (totalPrice == null) {
      totalPrice = extractAmountFromRaw(rawLine);
    }
    return {
      name,
      vatRate: vatInfo.vat,
      totalPrice,
      quantity: null,
      unit: null,
      unitPrice: null,
      raw: rawLine,
    };
  }

  if (HEADER_HINT.test(name) && totalPrice == null) return null;
  if (FOOTER_HINT.test(name) && (totalPrice == null || name.length < 12)) {
    return null;
  }

  const finalQty = weightedQty ?? quantity;
  const finalUnit = weightedUnit;
  const finalUnitPrice = weightedUnitPrice ?? null;
  if (
    finalQty != null &&
    finalUnitPrice != null &&
    totalPrice == null &&
    finalQty > 0
  ) {
    totalPrice = Math.round(finalQty * finalUnitPrice * 100) / 100;
  }

  return {
    name,
    vatRate: vatInfo.vat,
    totalPrice,
    quantity: finalQty,
    unit: finalUnit,
    unitPrice: finalUnitPrice,
    raw: rawLine,
  };
}

export function parseReceiptProductLines(
  rawText: string | null | undefined
): StructuralParseResult {
  const empty: StructuralParseResult = {
    items: [],
    charges: [],
    discounts: [],
    payments: [],
    unknownLines: [],
    classificationLog: [],
  };
  if (!rawText?.trim()) return empty;

  const lines = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const pendingNames: string[] = [];
  const state: ReceiptLineBuckets = emptyReceiptLineBuckets();
  const classificationLog: ClassificationLogEntry[] = [];

  const flushPending = (amount: number | null) => {
    if (pendingNames.length === 0) return;
    const merged = cleanProductName(pendingNames.join(" "));
    pendingNames.length = 0;
    if (merged.length < 2) return;

    const classification = classifyReceiptLine(merged, amount, merged);
    if (classification.kind === "product") {
      state.products.push({
        name: merged,
        quantity: null,
        unit: null,
        unitPrice: null,
        totalPrice: amount,
      });
      classificationLog.push({
        raw: merged,
        label: merged,
        kind: "product",
        reason: classification.reason,
        amount,
        action: "kept_product",
      });
      return;
    }

    routeClassifiedLine(classification, classificationLog, state);
  };

  for (const line of lines) {
    if (VAT_STANDALONE.test(line.replace(/\s/g, " ").trim())) {
      continue;
    }

    const xOnly = line.match(X_TOTAL);
    const moneyOnly = line.match(
      /^(?:x\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2})\s*(?:tl|₺)?$/i
    );
    if (moneyOnly || xOnly) {
      const amount = parseMoney((xOnly ?? moneyOnly)![1]);
      if (amount != null) {
        if (pendingNames.length) {
          flushPending(amount);
          continue;
        }
        const last = state.products[state.products.length - 1];
        if (last && (last.totalPrice == null || last.totalPrice <= 0)) {
          last.totalPrice = amount;
          continue;
        }
      }
      continue;
    }

    if (isHardNoiseLine(line)) {
      classificationLog.push({
        raw: line,
        label: line,
        kind: "unknown",
        reason: "hard noise (barcode/separator/empty)",
        amount: null,
        action: "skipped_noise",
      });
      flushPending(null);
      continue;
    }

    const parsed = parseReceiptProductLine(line);
    if (!parsed) {
      routeClassifiedLine(
        classifyReceiptLine(line, extractAmountFromRaw(line), line),
        classificationLog,
        state
      );
      continue;
    }

    const prefix =
      pendingNames.length > 0
        ? cleanProductName(`${pendingNames.join(" ")} ${parsed.name}`)
        : parsed.name;
    pendingNames.length = 0;
    const label = prefix || parsed.name;
    const amount = parsed.totalPrice;

    const classification = classifyReceiptLine(label, amount, parsed.raw);

    if (classification.kind !== "product") {
      routeClassifiedLine(
        { ...classification, label, amount, raw: parsed.raw },
        classificationLog,
        state
      );
      continue;
    }

    if (amount != null && amount > 0) {
      state.products.push({
        name: label,
        quantity: parsed.quantity,
        unit: parsed.unit,
        unitPrice: parsed.unitPrice,
        totalPrice: amount,
      });
      classificationLog.push({
        raw: parsed.raw,
        label,
        kind: "product",
        reason: classification.reason,
        amount,
        action: "kept_product",
      });
    } else {
      pendingNames.push(label);
    }
  }

  flushPending(null);

  const filteredProducts = state.products.filter((p) => {
    if (FOOTER_HINT.test(p.name) && (p.totalPrice == null || p.totalPrice < 1)) {
      state.unknownLines.push({
        label: p.name,
        amount: p.totalPrice,
        reason: "footer leftover removed from products",
        raw: p.name,
      });
      classificationLog.push({
        raw: p.name,
        label: p.name,
        kind: "unknown",
        reason: "footer leftover removed from products",
        amount: p.totalPrice,
        action: "moved_unknown",
      });
      return false;
    }
    return p.name.trim().length >= 2;
  });

  return {
    items: filteredProducts,
    charges: state.charges,
    discounts: state.discounts,
    payments: state.payments,
    unknownLines: state.unknownLines,
    classificationLog,
  };
}

export function getStructuralClassificationNotes(
  result: StructuralParseResult
): string[] {
  return formatClassificationLog(result.classificationLog);
}

export function repairMisreadQuantities(items: AnalysisItem[]): AnalysisItem[] {
  return items.map((item) => {
    let quantity = item.quantity;
    let totalPrice = item.totalPrice;
    let unitPrice = item.unitPrice;
    const unit = item.unit;
    const name = cleanProductName(item.name) || item.name;

    if (
      quantity != null &&
      quantity > 0 &&
      quantity < 50 &&
      unitPrice != null &&
      unitPrice > 0 &&
      unit &&
      /^(kg|g|gr|gram|ml|l|lt)$/i.test(unit)
    ) {
      const expected = Math.round(quantity * unitPrice * 100) / 100;
      if (
        totalPrice == null ||
        Math.abs((totalPrice ?? 0) - expected) > 0.05
      ) {
        totalPrice = expected;
      }
    }

    if (
      quantity != null &&
      quantity >= 50 &&
      (!Number.isInteger(quantity) || quantity >= 100)
    ) {
      if (totalPrice == null || totalPrice <= 0) {
        totalPrice = quantity;
      }
      quantity = null;
    }

    if (
      unitPrice != null &&
      totalPrice != null &&
      unitPrice > totalPrice * 5 &&
      unitPrice > 100
    ) {
      unitPrice = null;
    }

    return {
      ...item,
      name,
      quantity,
      unit,
      totalPrice,
      unitPrice,
    };
  });
}

function hasExplicitWeight(item: AnalysisItem): boolean {
  const unit = item.unit?.toLowerCase()?.trim();
  if (
    unit &&
    /^(kg|g|gr|gram)$/.test(unit) &&
    item.quantity != null &&
    item.quantity > 0
  ) {
    return true;
  }
  return /\d+(?:[.,]\d+)?\s*(kg|g|gr|gram)\b/i.test(item.name ?? "");
}

function hasExplicitMultiplication(item: AnalysisItem): boolean {
  if (/\b\d+\s*[x×]\s*\S/i.test(item.name ?? "")) return true;
  return (
    item.quantity != null &&
    item.quantity > 1 &&
    Number.isInteger(item.quantity)
  );
}

export function applyDefaultQuantity(item: AnalysisItem): AnalysisItem {
  const quantity = item.quantity;
  if (quantity != null && quantity > 0) return item;

  if (hasExplicitWeight(item)) {
    const m = (item.name ?? "").match(
      /(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gram)\b/i
    );
    if (m && (quantity == null || quantity === 0)) {
      let unit = m[2]!.toLowerCase();
      if (unit === "gr" || unit === "gram") unit = "g";
      return {
        ...item,
        quantity: Number(m[1]!.replace(",", ".")),
        unit: item.unit ?? unit,
      };
    }
    return item;
  }

  if (hasExplicitMultiplication(item)) return item;

  return { ...item, quantity: 1 };
}

export function applyDefaultQuantities(items: AnalysisItem[]): AnalysisItem[] {
  return items.map(applyDefaultQuantity);
}

export function mergeWithStructuralParse(
  aiItems: AnalysisItem[],
  rawText: string | null | undefined,
  existingCharges: ChargeLine[] = [],
  existingDiscounts: DiscountLine[] = [],
  existingPayments: PaymentLine[] = [],
  existingUnknownLines: UnknownLine[] = []
): {
  items: AnalysisItem[];
  charges: ChargeLine[];
  discounts: DiscountLine[];
  payments: PaymentLine[];
  unknownLines: UnknownLine[];
  usedStructural: boolean;
  declaredCount: number | null;
  classificationLog: ClassificationLogEntry[];
} {
  const declaredCount = detectDeclaredProductCount(rawText);
  const structural = parseReceiptProductLines(rawText);
  const repaired = repairMisreadQuantities(aiItems);

  let charges = [...existingCharges];
  for (const charge of structural.charges) {
    charges = appendCharge(charges, charge.label, charge.amount, charge.type);
  }

  const discountKeys = new Set(
    existingDiscounts.map(
      (d) => `${d.type}:${d.label.toLocaleLowerCase("tr-TR")}`
    )
  );
  const discounts = [
    ...existingDiscounts,
    ...structural.discounts.filter(
      (d) =>
        !discountKeys.has(`${d.type}:${d.label.toLocaleLowerCase("tr-TR")}`)
    ),
  ];

  const paymentKeys = new Set(
    existingPayments.map(
      (p) => `${p.type}:${p.label.toLocaleLowerCase("tr-TR")}`
    )
  );
  const payments = [
    ...existingPayments,
    ...structural.payments.filter(
      (p) => !paymentKeys.has(`${p.type}:${p.label.toLocaleLowerCase("tr-TR")}`)
    ),
  ];

  const unknownLines = [...existingUnknownLines, ...structural.unknownLines];

  const aiPriced = repaired.filter((i) => (i.totalPrice ?? 0) > 0).length;
  const structPriced = structural.items.filter((i) => (i.totalPrice ?? 0) > 0)
    .length;

  const structuralResult = {
    items: structural.items,
    charges,
    discounts,
    payments,
    unknownLines,
    usedStructural: true as const,
    declaredCount,
    classificationLog: structural.classificationLog,
  };

  if (
    declaredCount != null &&
    declaredCount >= 2 &&
    aiPriced < declaredCount * 0.6 &&
    structPriced >= Math.min(declaredCount, aiPriced + 1)
  ) {
    return structuralResult;
  }

  if (aiPriced <= 1 && structPriced >= 3) {
    return structuralResult;
  }

  if (aiPriced <= 2 && structPriced >= 2 && structPriced > aiPriced) {
    return structuralResult;
  }

  return {
    items: repaired.map((i) => ({
      ...i,
      name: cleanProductName(i.name) || i.name,
    })),
    charges,
    discounts,
    payments,
    unknownLines,
    usedStructural: false,
    declaredCount,
    classificationLog: structural.classificationLog,
  };
}
