import type { AnalysisResult, Expense, OcrCorrection, OcrCorrectionField } from "@/lib/types";
import { normalizeMerchantName } from "@/lib/merchants";
import { createId } from "@/lib/utils";

export function merchantKeyFromName(name: string | null | undefined): string {
  const n = normalizeMerchantName(name) || name?.trim() || "";
  return n.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

function normalizeComparable(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Diff OCR draft vs user-edited expense and produce correction rows.
 * Always keeps original OCR values in `originalValue` — never mutates expense.rawText.
 */
export function collectUserCorrections(
  draft: Expense,
  saved: Expense
): Omit<OcrCorrection, "id" | "createdAt">[] {
  const merchantKey =
    merchantKeyFromName(saved.merchantName) ||
    merchantKeyFromName(draft.merchantName) ||
    merchantKeyFromName(draft.merchantRaw) ||
    "_unknown";

  const rows: Omit<OcrCorrection, "id" | "createdAt">[] = [];

  const push = (
    field: OcrCorrectionField,
    original: string | null | undefined,
    corrected: string | null | undefined
  ) => {
    const o = (original ?? "").trim();
    const c = (corrected ?? "").trim();
    if (!o || !c) return;
    if (normalizeComparable(o) === normalizeComparable(c)) return;
    rows.push({
      merchantKey,
      field,
      originalValue: o,
      correctedValue: c,
      source: "user",
    });
  };

  push(
    "merchant",
    draft.merchantRaw || draft.merchantName,
    saved.merchantName
  );

  if (
    draft.totalAmount !== saved.totalAmount &&
    draft.totalAmount != null &&
    saved.totalAmount != null
  ) {
    push("total", String(draft.totalAmount), String(saved.totalAmount));
  }

  push("category", draft.category, saved.category);
  push("date", draft.date, saved.date);

  const draftItems = draft.items ?? [];
  const savedItems = saved.items ?? [];
  const used = new Set<number>();
  for (const s of savedItems) {
    const sName = s.name?.trim();
    if (!sName) continue;
    const raw = (s.rawText || "").trim();
    // Prefer matching by raw OCR text still present on the item
    let matchIdx = draftItems.findIndex(
      (d, i) =>
        !used.has(i) &&
        (d.rawText || d.name) &&
        normalizeComparable(d.rawText || d.name) ===
          normalizeComparable(raw || sName)
    );
    if (matchIdx < 0) {
      matchIdx = draftItems.findIndex(
        (d, i) =>
          !used.has(i) &&
          d.name &&
          normalizeComparable(d.name) !== normalizeComparable(sName) &&
          // same position heuristic when counts match
          false
      );
    }
    // Positional fallback
    if (matchIdx < 0) {
      matchIdx = draftItems.findIndex((_, i) => !used.has(i));
    }
    if (matchIdx < 0) continue;
    used.add(matchIdx);
    const d = draftItems[matchIdx]!;
    const original = (d.rawText || d.name || "").trim();
    if (
      original &&
      normalizeComparable(original) !== normalizeComparable(sName)
    ) {
      push("itemName", original, sName);
    }
  }

  return rows;
}

export function buildCorrectionRecords(
  draft: Expense,
  saved: Expense
): OcrCorrection[] {
  const now = new Date().toISOString();
  return collectUserCorrections(draft, saved).map((row) => ({
    ...row,
    id: createId("ocrfix"),
    createdAt: now,
  }));
}

/**
 * Apply stored corrections to an analysis / expense draft.
 * Never mutates rawText / merchantRaw / item.rawText.
 */
export function applyCorrectionsToExpense(
  expense: Expense,
  corrections: OcrCorrection[]
): { expense: Expense; appliedCount: number } {
  const key =
    merchantKeyFromName(expense.merchantName) ||
    merchantKeyFromName(expense.merchantRaw);
  if (!key || corrections.length === 0) {
    return { expense, appliedCount: 0 };
  }

  const relevant = corrections.filter(
    (c) => c.merchantKey === key || c.merchantKey === "_unknown"
  );
  if (!relevant.length) return { expense, appliedCount: 0 };

  // Prefer newest correction for a given original→field pair
  const byOriginal = new Map<string, OcrCorrection>();
  for (const c of [...relevant].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  )) {
    const mapKey = `${c.field}::${normalizeComparable(c.originalValue)}`;
    byOriginal.set(mapKey, c);
  }

  let appliedCount = 0;
  let next: Expense = { ...expense, items: [...(expense.items ?? [])] };

  const find = (field: OcrCorrectionField, original: string | null | undefined) => {
    if (!original) return null;
    return (
      byOriginal.get(`${field}::${normalizeComparable(original)}`) ?? null
    );
  };

  const merchantOriginal = expense.merchantRaw || expense.merchantName;
  const merchantFix = find("merchant", merchantOriginal);
  if (merchantFix) {
    next = {
      ...next,
      merchantName: normalizeMerchantName(merchantFix.correctedValue),
      // keep merchantRaw as original OCR
      merchantRaw: expense.merchantRaw ?? expense.merchantName,
    };
    appliedCount += 1;
  }

  const totalFix = find("total", String(expense.totalAmount));
  if (totalFix) {
    const n = Number(totalFix.correctedValue.replace(",", "."));
    if (Number.isFinite(n)) {
      next = { ...next, totalAmount: n };
      appliedCount += 1;
    }
  }

  const catFix = find("category", expense.category);
  if (catFix) {
    next = { ...next, category: catFix.correctedValue };
    appliedCount += 1;
  }

  const dateFix = find("date", expense.date);
  if (dateFix) {
    next = { ...next, date: dateFix.correctedValue };
    appliedCount += 1;
  }

  next.items = next.items.map((item) => {
    const original = item.rawText || item.name;
    const fix = find("itemName", original);
    if (!fix) return item;
    appliedCount += 1;
    return {
      ...item,
      name: fix.correctedValue,
      // preserve raw OCR on the item
      rawText: item.rawText ?? item.name,
    };
  });

  return { expense: next, appliedCount };
}

/** Apply corrections at AnalysisResult stage (before expense draft). */
export function applyCorrectionsToAnalysis(
  analysis: AnalysisResult,
  corrections: OcrCorrection[]
): AnalysisResult {
  const key = merchantKeyFromName(analysis.merchantName);
  if (!key) return analysis;

  const relevant = corrections.filter((c) => c.merchantKey === key);
  if (!relevant.length) return analysis;

  const byOriginal = new Map<string, OcrCorrection>();
  for (const c of [...relevant].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  )) {
    byOriginal.set(
      `${c.field}::${normalizeComparable(c.originalValue)}`,
      c
    );
  }

  let next = { ...analysis, items: [...(analysis.items ?? [])] };

  const merchantFix = byOriginal.get(
    `merchant::${normalizeComparable(analysis.merchantName || "")}`
  );
  if (merchantFix) {
    next = {
      ...next,
      merchantName: normalizeMerchantName(merchantFix.correctedValue),
    };
  }

  next.items = next.items.map((item) => {
    const fix = byOriginal.get(
      `itemName::${normalizeComparable(item.name || "")}`
    );
    const fixOcr = byOriginal.get(
      `itemName::${normalizeComparable(item.ocrName || item.name || "")}`
    );
    const chosen = fixOcr ?? fix;
    if (!chosen) return item;
    return { ...item, name: chosen.correctedValue };
  });

  return next;
}
