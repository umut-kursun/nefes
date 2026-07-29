import type { AnalysisItem, AnalysisResult } from "@/lib/types";
import type { ChargeLine, DiscountLine, PaymentLine, UnknownLine } from "@/lib/receipt-model";
import {
  normalizeChargeLine,
  normalizeDiscountLine,
  readChargesField,
  readDiscountsField,
  readPaymentsField,
  readUnknownLinesField,
} from "@/lib/receipt-model";
import {
  coerceMoney,
  isReasonableLinePrice,
  looksLikeOcrGhostPrice,
} from "@/lib/money";
import {
  applyDefaultQuantities,
  repairMisreadQuantities,
} from "@/lib/receipt-line-parser";
import { cleanProductName } from "@/lib/product-name-cleaner";
import {
  isReceiptChargeLine,
  isReceiptDiscountLine,
} from "@/lib/receipt-charges";
import {
  classifyReceiptLine,
  formatClassificationLog,
  type ClassificationLogEntry,
} from "@/lib/receipt-line-classifier";
import {
  emptyReceiptLineBuckets,
  routeClassifiedLine,
} from "@/lib/receipt-line-routing";

export type ReceiptConsistency = {
  /** Expected total: products + charges − discounts */
  itemsSum: number;
  total: number | null;
  delta: number | null;
  /** Absolute relative error when total > 0 */
  relativeError: number | null;
  inconsistent: boolean;
  warning: string | null;
};

/** Money match tolerance (1 kuruş). */
const TOLERANCE_ABS = 0.01;


export function sumItemPrices(
  items: Array<{ totalPrice?: number | null }>
): number {
  return items.reduce((acc, i) => acc + (i.totalPrice || 0), 0);
}

export function sumChargeAmounts(
  lines: Array<{ amount?: number | null }>
): number {
  return lines.reduce((acc, i) => acc + Math.abs(i.amount || 0), 0);
}

/** products + charges − discounts */
export function computeExpectedReceiptTotal(
  items: Array<{ totalPrice?: number | null }>,
  charges: Array<{ amount?: number | null }> = [],
  discounts: Array<{ amount?: number | null }> = []
): number {
  return (
    sumItemPrices(items) +
    sumChargeAmounts(charges) -
    sumChargeAmounts(discounts)
  );
}

export function checkReceiptConsistency(
  items: Array<{ totalPrice?: number | null }>,
  total: number | null | undefined,
  charges: Array<{ amount?: number | null }> = [],
  discounts: Array<{ amount?: number | null }> = []
): ReceiptConsistency {
  const itemsSum = computeExpectedReceiptTotal(items, charges, discounts);
  const t = total ?? null;
  if (t == null || t <= 0 || items.length === 0 || itemsSum <= 0) {
    return {
      itemsSum,
      total: t,
      delta: null,
      relativeError: null,
      inconsistent: false,
      warning: null,
    };
  }

  const delta = Math.abs(itemsSum - t);
  const relativeError = delta / t;
  const inconsistent = delta > TOLERANCE_ABS;

  return {
    itemsSum,
    total: t,
    delta,
    relativeError,
    inconsistent,
    warning: inconsistent
      ? "Bu fişte tutarsızlık tespit edildi. Ürün fiyatlarını kaydetmeden önce kontrol et."
      : null,
  };
}

export type LineItemIssue = {
  name: string;
  reason: string;
  expected: number | null;
  parsed: number | null;
};

type IssueItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
};

/**
 * Highlight specific products likely causing a receipt total mismatch.
 */
export function findLineItemIssues(
  items: IssueItem[],
  total: number | null | undefined,
  charges: Array<{ amount?: number | null }> = [],
  discounts: Array<{ amount?: number | null }> = []
): LineItemIssue[] {
  const issues: LineItemIssue[] = [];
  const seen = new Set<string>();

  const push = (issue: LineItemIssue) => {
    const key = `${issue.name}::${issue.reason}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push(issue);
  };

  for (const item of items) {
    const parsed = item.totalPrice;
    if (parsed == null || parsed <= 0) continue;

    const qty = item.quantity;
    const unitPrice = item.unitPrice;
    if (qty != null && qty > 0 && unitPrice != null && unitPrice > 0) {
      const expected = Math.round(qty * unitPrice * 100) / 100;
      const delta = Math.abs(expected - parsed);
      if (delta > TOLERANCE_ABS) {
        const isWeighted =
          item.unit != null &&
          /^(kg|g|gr|gram|ml|l|lt|litre|adet)$/i.test(item.unit.trim());
        push({
          name: item.name,
          reason: isWeighted
            ? "Tartılı ürün — miktar × birim fiyat toplamla uyuşmuyor"
            : "Miktar × birim fiyat satır toplamıyla uyuşmuyor",
          expected,
          parsed,
        });
      }
    }

    // unitPrice looks like line total (common OCR swap on weighted lines)
    if (
      qty != null &&
      qty > 0 &&
      qty < 10 &&
      unitPrice != null &&
      unitPrice > parsed * 1.5 &&
      item.unit &&
      /kg|g|gr|gram/i.test(item.unit)
    ) {
      const expected = Math.round(qty * unitPrice * 100) / 100;
      push({
        name: item.name,
        reason: "Tartılı ürün — birim fiyat ve satır toplamı karışmış olabilir",
        expected,
        parsed,
      });
    }
  }

  const expectedTotal = computeExpectedReceiptTotal(
    items,
    charges,
    discounts
  );
  const receiptTotal = total ?? null;
  if (
    receiptTotal != null &&
    receiptTotal > 0 &&
    expectedTotal > 0 &&
    Math.abs(expectedTotal - receiptTotal) > TOLERANCE_ABS
  ) {
    const gap = Math.round((expectedTotal - receiptTotal) * 100) / 100;
    const priced = items.filter((i) => (i.totalPrice ?? 0) > 0);

    for (const item of priced) {
      const p = item.totalPrice ?? 0;
      if (Math.abs(p - Math.abs(gap)) <= TOLERANCE_ABS * 2) {
        push({
          name: item.name,
          reason:
            gap > 0
              ? "Bu satır fazladan toplama eklenmiş olabilir"
              : "Bu satır eksik veya yanlış fiyatlı olabilir",
          expected: gap > 0 ? 0 : p + Math.abs(gap),
          parsed: p,
        });
      }
    }

    // Largest priced line when gap is significant
    if (issues.length === 0 && priced.length > 0) {
      const sorted = [...priced].sort(
        (a, b) => (b.totalPrice ?? 0) - (a.totalPrice ?? 0)
      );
      const suspect = sorted[0]!;
      push({
        name: suspect.name,
        reason: "Fiş toplamı uyuşmazlığına en çok katkı eden satır",
        expected:
          Math.round(((suspect.totalPrice ?? 0) - gap) * 100) / 100,
        parsed: suspect.totalPrice ?? null,
      });
    }
  }

  return issues;
}

/**
 * Move misclassified fee/discount product lines into receipt-level arrays.
 * Uses explicit line classification — non-product lines are never silently dropped.
 */
export function separateReceiptLevelCharges<
  T extends { name: string; totalPrice: number | null },
>(
  items: T[],
  existingCharges: ChargeLine[] = [],
  existingDiscounts: DiscountLine[] = [],
  existingPayments: PaymentLine[] = [],
  existingUnknownLines: UnknownLine[] = []
): {
  items: T[];
  charges: ChargeLine[];
  discounts: DiscountLine[];
  payments: PaymentLine[];
  unknownLines: UnknownLine[];
  classificationLog: ClassificationLogEntry[];
} {
  const products: T[] = [];
  const buckets = emptyReceiptLineBuckets();
  buckets.charges = [...existingCharges];
  buckets.discounts = [...existingDiscounts];
  buckets.payments = [...existingPayments];
  buckets.unknownLines = [...existingUnknownLines];
  const classificationLog: ClassificationLogEntry[] = [];

  for (const item of items) {
    const name = item.name ?? "";
    const amount = item.totalPrice;
    const classification = classifyReceiptLine(name, amount, name);

    if (classification.kind === "product") {
      products.push(item);
      classificationLog.push({
        raw: name,
        label: name,
        kind: "product",
        reason: classification.reason,
        amount,
        action: "kept_product",
      });
      continue;
    }

    if (
      classification.kind === "unknown" &&
      amount != null &&
      Math.abs(amount) > 0 &&
      (isReceiptChargeLine(name) || isReceiptDiscountLine(name))
    ) {
      routeClassifiedLine(
        isReceiptDiscountLine(name)
          ? { ...classification, kind: "discount" }
          : { ...classification, kind: "receipt_charge" },
        classificationLog,
        buckets
      );
      continue;
    }

    routeClassifiedLine(classification, classificationLog, buckets);
  }

  return {
    items: products,
    charges: buckets.charges,
    discounts: buckets.discounts,
    payments: buckets.payments,
    unknownLines: buckets.unknownLines,
    classificationLog,
  };
}

export function getSeparationClassificationNotes(
  log: ClassificationLogEntry[]
): string[] {
  return formatClassificationLog(log.filter((e) => e.kind !== "product"));
}

/**
 * Drop zero-price lines that look like menu/bundle contents under a priced parent.
 * Keeps legitimate free items when they are the only lines or stand alone.
 */
export function filterBundledZeroItems<
  T extends { name: string; totalPrice: number | null },
>(items: T[]): T[] {
  if (items.length === 0) return items;

  const hasPriced = items.some((i) => (i.totalPrice ?? 0) > 0);
  if (!hasPriced) return items;

  const MENU_HINT =
    /\b(menu|menü|menu\s*large|menu\s*medium|menu\s*small|combo|set|paket\s*menü|burger\s*menu)\b/i;

  return items.filter((item, index) => {
    const price = item.totalPrice ?? 0;
    if (price > 0) return true;

    // Look backward for a priced menu/parent line
    for (let j = index - 1; j >= 0; j--) {
      const prev = items[j]!;
      if ((prev.totalPrice ?? 0) > 0) {
        if (MENU_HINT.test(prev.name) || MENU_HINT.test(item.name)) {
          return false;
        }
        // Zero line immediately after a priced food item → bundled side
        if (index - j <= 3) {
          const sideHint =
            /\b(patates|potato|fry|fries|içecek|icecek|drink|cola|ayran|sos|sauce|ketchup|mayo|salata|salad|ekstra)\b/i;
          if (sideHint.test(item.name)) return false;
        }
        break;
      }
    }
    return true;
  });
}

/** Strip OCR ghost line prices that dwarf the receipt total. */
export function sanitizeAnalysisItems(
  items: AnalysisItem[],
  receiptTotal: number | null
): AnalysisItem[] {
  const cleaned = repairMisreadQuantities(items).map((item) => {
    let totalPrice = item.totalPrice;
    let unitPrice = item.unitPrice;
    const name = cleanProductName(item.name) || item.name;

    if (
      totalPrice != null &&
      looksLikeOcrGhostPrice(totalPrice, receiptTotal)
    ) {
      totalPrice = null;
    }
    if (
      unitPrice != null &&
      looksLikeOcrGhostPrice(unitPrice, receiptTotal)
    ) {
      unitPrice = null;
    }
    if (totalPrice != null && !isReasonableLinePrice(totalPrice)) {
      totalPrice = null;
    }

    return { ...item, name, totalPrice, unitPrice };
  });

  const withDefaults = applyDefaultQuantities(filterBundledZeroItems(cleaned));
  return withDefaults;
}

/**
 * Final pass: separate charges, apply default quantities on products.
 */
export function finalizeReceiptAnalysis(analysis: AnalysisResult): AnalysisResult {
  const separated = separateReceiptLevelCharges(
    analysis.items ?? [],
    analysis.charges ?? [],
    analysis.discounts ?? [],
    analysis.payments ?? [],
    analysis.unknownLines ?? []
  );
  return {
    ...analysis,
    items: applyDefaultQuantities(separated.items),
    charges: separated.charges.map((c) => normalizeChargeLine(c)),
    discounts: separated.discounts.map((d) => normalizeDiscountLine(d)),
    payments: separated.payments,
    unknownLines: separated.unknownLines,
  };
}

/**
 * Deep-coerce money-like fields on a raw model JSON object before Zod.
 */
export function preprocessAnalysisJson(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const obj = { ...(input as Record<string, unknown>) };

  obj.totalAmount = coerceMoney(obj.totalAmount);
  obj.packCount = coerceMoney(obj.packCount);
  obj.confidence =
    typeof obj.confidence === "number"
      ? obj.confidence
      : coerceMoney(obj.confidence) ?? 0;

  if (Array.isArray(obj.items)) {
    obj.items = obj.items.map((raw) => {
      if (!raw || typeof raw !== "object") return raw;
      const item = { ...(raw as Record<string, unknown>) };
      item.quantity = coerceMoney(item.quantity);
      item.unitPrice = coerceMoney(item.unitPrice);
      item.totalPrice = coerceMoney(item.totalPrice);
      return item;
    });
  }

  obj.charges = readChargesField(obj);
  obj.discounts = readDiscountsField(obj);
  obj.payments = readPaymentsField(obj);
  obj.unknownLines = readUnknownLinesField(obj);
  delete obj.extraCharges;
  delete obj.receiptCharges;

  if (obj.fuel && typeof obj.fuel === "object") {
    const fuel = { ...(obj.fuel as Record<string, unknown>) };
    fuel.liters = coerceMoney(fuel.liters);
    fuel.pricePerLiter = coerceMoney(fuel.pricePerLiter);
    fuel.odometer = coerceMoney(fuel.odometer);
    obj.fuel = fuel;
  }

  const total = typeof obj.totalAmount === "number" ? obj.totalAmount : null;
  if (Array.isArray(obj.items)) {
    const items = sanitizeAnalysisItems(obj.items as AnalysisItem[], total);
    const separated = separateReceiptLevelCharges(
      items,
      obj.charges as ChargeLine[],
      obj.discounts as DiscountLine[],
      obj.payments as PaymentLine[],
      obj.unknownLines as UnknownLine[]
    );
    obj.items = separated.items;
    obj.charges = separated.charges;
    obj.discounts = separated.discounts;
    obj.payments = separated.payments;
    obj.unknownLines = separated.unknownLines;
  }

  return obj;
}

export function analysisHasCorruptedPrices(
  analysis: AnalysisResult
): boolean {
  const total = analysis.totalAmount;
  if (total == null || total <= 0) return false;
  const priced = analysis.items.filter((i) => (i.totalPrice ?? 0) > 0);
  if (priced.length === 0) return false;
  const ghosts = priced.filter((i) =>
    looksLikeOcrGhostPrice(i.totalPrice!, total)
  );
  return ghosts.length >= Math.ceil(priced.length * 0.5);
}
