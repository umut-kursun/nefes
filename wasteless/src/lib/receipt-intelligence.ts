import type { AnalysisResult } from "@/lib/types";
import { normalizeMerchantName } from "@/lib/merchants";
import { normalizeTime } from "@/lib/datetime";
import { parseMoney, looksLikeOcrGhostPrice } from "@/lib/money";
import {
  checkReceiptConsistency,
  computeExpectedReceiptTotal,
  filterBundledZeroItems,
  finalizeReceiptAnalysis,
  getSeparationClassificationNotes,
  sanitizeAnalysisItems,
  separateReceiptLevelCharges,
} from "@/lib/receipt-quality";
import {
  getStructuralClassificationNotes,
  mergeWithStructuralParse,
} from "@/lib/receipt-line-parser";
import { cleanProductName } from "@/lib/product-name-cleaner";
import { isReceiptChargeLine, isReceiptDiscountLine } from "@/lib/receipt-charges";
import {
  readChargesField,
  readDiscountsField,
  readPaymentsField,
  readUnknownLinesField,
} from "@/lib/receipt-model";

export type ReceiptIntelligenceResult = {
  analysis: AnalysisResult;
  /** Human-readable notes about automatic corrections (debug / optional UI). */
  corrections: string[];
  consistency: ReturnType<typeof checkReceiptConsistency>;
};

/** Labels that indicate VAT — never use these as the receipt grand total. */
const VAT_LABEL =
  /\b(kdv|kd\.?v|vat|tax|vergi|toplam\s*kdv|kdv\s*toplam|kdv\s*%|kdvtutar)\b/i;

/** Strong grand-total labels (highest priority). */
const GRAND_TOTAL_LABEL =
  /\b(genel\s*toplam|ödenen|odenen|ödenecek|odenecek|net\s*toplam|toplam\s*tutar|fis\s*toplam|fiş\s*toplam|grand\s*total|amount\s*due|payable)\b/i;

/** Acceptable total labels (after grand). */
const TOTAL_LABEL =
  /\b(toplam|total|sum|nakit|kart|kredi\s*kart|credit\s*card|cash)\b/i;

/** Explicit non-total lines. */
const NON_TOTAL_LABEL =
  /\b(ara\s*toplam|subtotal|indirim|iskonto|discount|puan|loyalty|para\s*üstü|paraustu|change)\b/i;

type LabeledAmount = {
  label: string;
  amount: number;
  priority: number;
  index: number;
};

function normalizeOcrText(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/[–—]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Extract labeled money amounts from OCR raw text.
 * Priority: genel toplam > toplam/ödenecek > nakit/kart >> never VAT.
 */
export function extractLabeledAmounts(rawText: string): LabeledAmount[] {
  const text = normalizeOcrText(rawText);
  if (!text) return [];

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const found: LabeledAmount[] = [];

  const moneyToken =
    /(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2}|\d{2,})/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const next = lines[i + 1] ?? "";
    const combined = `${line} ${next}`;

    if (VAT_LABEL.test(line) || VAT_LABEL.test(combined)) {
      // Capture VAT for awareness but mark priority very low / skip for total
      const vatMatch = combined.match(moneyToken);
      if (vatMatch) {
        const amount = parseMoney(vatMatch[vatMatch.length - 1]);
        if (amount != null && amount > 0) {
          found.push({
            label: line,
            amount,
            priority: -100,
            index: i,
          });
        }
      }
      continue;
    }

    if (NON_TOTAL_LABEL.test(line)) continue;

    let priority = 0;
    if (GRAND_TOTAL_LABEL.test(line) || GRAND_TOTAL_LABEL.test(combined)) {
      priority = 100;
    } else if (
      /\b(ödenecek|odenecek|ödenen|odenen)\b/i.test(line) ||
      /\b(ödenecek|odenecek)\b/i.test(combined)
    ) {
      priority = 95;
    } else if (
      /(^|\s)toplam(\s|$)/i.test(line) &&
      !VAT_LABEL.test(line)
    ) {
      // Bare TOPLAM — not TOPLAM KDV
      priority = 90;
    } else if (TOTAL_LABEL.test(line) && !VAT_LABEL.test(line)) {
      priority = 70;
    } else {
      continue;
    }

    // Amount on same line or next line
    const collect = (s: string) => {
      const out: string[] = [];
      const re = new RegExp(moneyToken.source, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) out.push(m[0]!);
      return out;
    };
    const sameLine = collect(line);
    const nextLine = collect(next);
    const candidates = sameLine.length ? sameLine : nextLine;

    for (const token of candidates) {
      const amount = parseMoney(token);
      if (amount == null || amount <= 0) continue;
      found.push({ label: line, amount, priority, index: i });
    }
  }

  return found;
}

/**
 * Pick the best receipt total from labeled amounts.
 * Never returns a VAT amount when a real total exists.
 */
export function detectReceiptTotal(rawText: string | null | undefined): number | null {
  const amounts = extractLabeledAmounts(rawText ?? "");
  const usable = amounts.filter((a) => a.priority > 0);
  if (usable.length === 0) return null;

  usable.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    // Prefer later occurrence (totals usually at bottom)
    return b.index - a.index;
  });

  return usable[0]?.amount ?? null;
}

function detectDateFromText(raw: string): string | null {
  // dd.MM.yyyy or dd/MM/yyyy
  const m1 = raw.match(/\b(\d{2})[./](\d{2})[./](\d{4})\b/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  // yyyy-MM-dd
  const m2 = raw.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}

function detectTimeFromText(raw: string): string | null {
  const m = raw.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (!m) return null;
  return normalizeTime(`${m[1]}:${m[2]}`);
}

/**
 * When product sum ≈ a candidate total from text, prefer that total.
 * Also fix AI picking VAT (TOPLAM KDV) over TOPLAM.
 */
function resolveTrustedTotal(
  analysis: AnalysisResult,
  corrections: string[]
): number | null {
  const fromText = detectReceiptTotal(analysis.rawText);
  const aiTotal = analysis.totalAmount;
  const itemsSum = computeExpectedReceiptTotal(
    analysis.items,
    analysis.charges,
    analysis.discounts
  );

  // Case: AI returned VAT while text has a larger grand total
  if (fromText != null && aiTotal != null) {
    if (aiTotal < fromText * 0.4 && fromText > aiTotal) {
      // Classic TOPLAM KDV vs TOPLAM mix-up
      corrections.push(
        `Toplam düzeltildi: KDV (${aiTotal}) yerine fiş toplamı (${fromText}) kullanıldı.`
      );
      return fromText;
    }
  }

  // Prefer text total when AI missing
  if ((aiTotal == null || aiTotal <= 0) && fromText != null) {
    corrections.push(`Toplam OCR metninden okundu: ${fromText}.`);
    return fromText;
  }

  // If items sum matches text total better than AI total
  if (fromText != null && itemsSum > 0) {
    const dText = Math.abs(itemsSum - fromText);
    const dAi = aiTotal != null ? Math.abs(itemsSum - aiTotal) : Infinity;
    if (dText + 1 < dAi && dText / fromText < 0.08) {
      corrections.push(
        `Toplam ürünler toplamına göre düzeltildi: ${fromText}.`
      );
      return fromText;
    }
  }

  // If AI total looks like VAT vs items sum
  if (aiTotal != null && itemsSum > 0 && aiTotal < itemsSum * 0.35) {
    if (fromText != null && Math.abs(fromText - itemsSum) / itemsSum < 0.1) {
      corrections.push(
        `Toplam ürünler + metin ile doğrulandı: ${fromText}.`
      );
      return fromText;
    }
    // Fall back to items sum if close enough as last resort
    if (itemsSum > aiTotal * 2) {
      corrections.push(
        `Şüpheli toplam (${aiTotal}); ürünler toplamı (${itemsSum}) tercih edildi.`
      );
      return Math.round(itemsSum * 100) / 100;
    }
  }

  return aiTotal ?? fromText;
}

/**
 * Multi-stage Receipt Intelligence: clean OCR before the user reviews it.
 */
export function applyReceiptIntelligence(
  input: AnalysisResult
): ReceiptIntelligenceResult {
  const corrections: string[] = [];
  const inputRecord = input as unknown as Record<string, unknown>;
  let analysis: AnalysisResult = {
    ...input,
    rawText: normalizeOcrText(input.rawText) || input.rawText,
    merchantName: normalizeMerchantName(input.merchantName) || input.merchantName,
    time: normalizeTime(input.time) ?? input.time,
    charges: readChargesField(inputRecord),
    discounts: readDiscountsField(inputRecord),
    payments: readPaymentsField(inputRecord),
    unknownLines: readUnknownLinesField(inputRecord),
  };

  // Fill date/time from raw text when missing
  if (!analysis.date && analysis.rawText) {
    const d = detectDateFromText(analysis.rawText);
    if (d) {
      analysis = { ...analysis, date: d };
      corrections.push("Tarih OCR metninden tamamlandı.");
    }
  }
  if (!analysis.time && analysis.rawText) {
    const t = detectTimeFromText(analysis.rawText);
    if (t) {
      analysis = { ...analysis, time: t };
      corrections.push("Saat OCR metninden tamamlandı.");
    }
  }

  // Sanitize line items (ghost prices + menu zeros)
  let items = sanitizeAnalysisItems(
    analysis.items ?? [],
    analysis.totalAmount
  );
  items = filterBundledZeroItems(items);
  if (items.length !== (analysis.items?.length ?? 0)) {
    corrections.push("Sıfır fiyatlı menü yan ürünleri filtrelendi.");
  }

  // Column-aware structural parse — recover VAT/total columns & fragmented names
  const merged = mergeWithStructuralParse(
    items,
    analysis.rawText,
    analysis.charges ?? [],
    analysis.discounts ?? [],
    analysis.payments ?? [],
    analysis.unknownLines ?? []
  );
  items = merged.items;
  let charges = merged.charges;
  let discounts = merged.discounts;
  let payments = merged.payments;
  let unknownLines = merged.unknownLines;

  if (merged.usedStructural) {
    corrections.push(
      "Ürün satırları fiş yapısından yeniden kuruldu (KDV / toplam sütunları)."
    );
  }

  const structuralNotes = getStructuralClassificationNotes({
    items: merged.items,
    charges: merged.charges,
    discounts: merged.discounts,
    payments: merged.payments,
    unknownLines: merged.unknownLines,
    classificationLog: merged.classificationLog,
  });
  for (const note of structuralNotes) {
    corrections.push(`[line-classify] ${note}`);
  }

  if (merged.charges.length > (analysis.charges?.length ?? 0)) {
    corrections.push(
      `${merged.charges.length - (analysis.charges?.length ?? 0)} receipt charge(s) extracted from OCR structure.`
    );
  }
  if (
    merged.declaredCount != null &&
    items.filter((i) => (i.totalPrice ?? 0) > 0).length <
      merged.declaredCount * 0.7
  ) {
    corrections.push(
      `Fişte ${merged.declaredCount} ürün adedi yazıyor; çıkarılan ürün sayısı düşük — kontrol et.`
    );
    analysis = {
      ...analysis,
      confidence: Math.min(analysis.confidence, 0.55),
    };
  }

  // Final name cleanup (VAT % must never remain in product names)
  items = items.map((item) => ({
    ...item,
    name: cleanProductName(item.name) || item.name,
  }));

  // Drop lines that still look like OCR garbage vs resolved total candidates
  const textTotal = detectReceiptTotal(analysis.rawText);
  items = items.filter((item) => {
    const p = item.totalPrice;
    if (p == null) return true;
    const name = item.name ?? "";
    if (
      isReceiptChargeLine(name) ||
      isReceiptDiscountLine(name)
    ) {
      return true;
    }
    if (looksLikeOcrGhostPrice(p, textTotal ?? analysis.totalAmount)) {
      corrections.push(`Hayalet fiyat elendi: ${item.name} (${p}).`);
      return false;
    }
    return true;
  });

  // Move fee/discount lines out of products into receipt-level arrays
  const prevChargeCount = charges.length;
  const prevDiscountCount = discounts.length;
  const prevPaymentCount = payments.length;
  const prevUnknownCount = unknownLines.length;
  const prevItemCount = items.length;
  const separated = separateReceiptLevelCharges(
    items,
    charges,
    discounts,
    payments,
    unknownLines
  );
  items = separated.items;
  charges = separated.charges;
  discounts = separated.discounts;
  payments = separated.payments;
  unknownLines = separated.unknownLines;
  for (const note of getSeparationClassificationNotes(
    separated.classificationLog
  )) {
    corrections.push(`[line-classify] ${note}`);
  }
  if (
    separated.charges.length !== prevChargeCount ||
    separated.discounts.length !== prevDiscountCount ||
    separated.payments.length !== prevPaymentCount ||
    separated.unknownLines.length !== prevUnknownCount ||
    separated.items.length !== prevItemCount
  ) {
    corrections.push(
      "Kargo / poşet / hizmet / indirim / ödeme satırları ürün listesinden ayrıldı (charges)."
    );
  }

  analysis = {
    ...analysis,
    items,
    charges: separated.charges,
    discounts: separated.discounts,
    payments: separated.payments,
    unknownLines: separated.unknownLines,
  };

  const trustedTotal = resolveTrustedTotal(analysis, corrections);
  if (trustedTotal != null && trustedTotal !== analysis.totalAmount) {
    analysis = { ...analysis, totalAmount: trustedTotal };
  }

  // Auto-correct: if still inconsistent but items sum is coherent, prefer items sum
  let consistency = checkReceiptConsistency(
    analysis.items,
    analysis.totalAmount,
    analysis.charges,
    analysis.discounts
  );
  if (consistency.inconsistent && consistency.itemsSum > 0) {
    const sum = consistency.itemsSum;
    const total = analysis.totalAmount ?? 0;
    // Only auto-fix when sum is clearly the better "real" total
    if (total > 0 && sum > total * 1.5 && textTotal && Math.abs(textTotal - sum) / sum < 0.1) {
      analysis = { ...analysis, totalAmount: textTotal };
      corrections.push("Toplam otomatik düzeltildi (ürünler + fiş metni).");
      consistency = checkReceiptConsistency(
        analysis.items,
        analysis.totalAmount,
        analysis.charges,
        analysis.discounts
      );
    } else if (
      total > 0 &&
      looksLikeOcrGhostPrice(total, sum) === false &&
      sum > 0 &&
      Math.abs(sum - (textTotal ?? sum)) < 2
    ) {
      // leave inconsistent for user warning
    }
  }

  // Lower confidence when still inconsistent
  if (consistency.inconsistent) {
    analysis = {
      ...analysis,
      confidence: Math.min(analysis.confidence, 0.5),
    };
  }

  // VAT must never equal totalAmount when a larger total exists in text
  if (
    analysis.totalAmount != null &&
    textTotal != null &&
    analysis.totalAmount < textTotal &&
    analysis.rawText &&
    VAT_LABEL.test(analysis.rawText)
  ) {
    const vatHits = extractLabeledAmounts(analysis.rawText).filter(
      (a) => a.priority < 0
    );
    if (vatHits.some((v) => Math.abs(v.amount - analysis.totalAmount!) < 0.05)) {
      analysis = { ...analysis, totalAmount: textTotal };
      corrections.push("KDV tutarı toplam olarak seçilmişti; düzeltildi.");
      consistency = checkReceiptConsistency(
        analysis.items,
        analysis.totalAmount,
        analysis.charges,
        analysis.discounts
      );
    }
  }

  return { analysis: finalizeReceiptAnalysis(analysis), corrections, consistency };
}

/** Re-export helpers used by review UI. */
export { checkReceiptConsistency, computeExpectedReceiptTotal };
