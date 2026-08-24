import { parseDate } from "@/lib/receipt-engine/layer-6-purchase/parsers/dateParser";
import { receiptReconciliationTolerance, nearlyEqual } from "@/lib/receipt-engine/layer-7-validate/validation/issueFactory";
import type { ReceiptGroundTruth } from "./ground-truth";
import {
  ADDRESS_LIKE_MERCHANT,
  containsFolded,
  isPollutedProductName,
  LEGAL_ENTITY_MERCHANT,
} from "./patterns";
import type { ContractReport, FieldVerdict, ReceiptPipelineSnapshot } from "./types";

function normalizeTimeForCompare(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const hh = m[1]!.padStart(2, "0");
  const mm = m[2]!;
  return `${hh}:${mm}`;
}

function moneyMatch(
  actual: number | null | undefined,
  expected: number
): boolean {
  if (actual == null || !Number.isFinite(actual)) return false;
  return nearlyEqual(actual, expected, receiptReconciliationTolerance(expected));
}

function verdictForMandatory(
  ok: boolean,
  analysisStatus: ReceiptPipelineSnapshot["analysisStatus"]
): FieldVerdict {
  if (ok) return "correct";
  if (analysisStatus === "approved") return "incorrect";
  return "needs_review";
}

function evaluateMerchant(
  snap: ReceiptPipelineSnapshot,
  gt: ReceiptGroundTruth
): { verdict: FieldVerdict; notes: string[] } {
  const notes: string[] = [];
  const merchant = snap.merchant?.trim() ?? "";
  if (!merchant) {
    notes.push("merchant missing");
    return { verdict: "needs_review", notes };
  }

  const containsExpected = containsFolded(merchant, gt.merchantContains);
  const canonicalOk =
    !gt.merchantCanonical ||
    containsFolded(merchant, gt.merchantCanonical) ||
    containsFolded(merchant, gt.merchantContains);

  if (ADDRESS_LIKE_MERCHANT.test(merchant) || LEGAL_ENTITY_MERCHANT.test(merchant)) {
    notes.push(`merchant looks like legal entity or address: "${merchant}"`);
  }

  const ok = containsExpected && canonicalOk && !ADDRESS_LIKE_MERCHANT.test(merchant);
  return {
    verdict: verdictForMandatory(ok, snap.analysisStatus),
    notes,
  };
}

function evaluateCategory(
  snap: ReceiptPipelineSnapshot,
  gt: ReceiptGroundTruth
): FieldVerdict {
  if (snap.categoryId === gt.categoryId) return "correct";
  return verdictForMandatory(false, snap.analysisStatus);
}

function evaluateDate(
  snap: ReceiptPipelineSnapshot,
  gt: ReceiptGroundTruth
): FieldVerdict {
  if (!gt.date) {
    return snap.date ? "correct" : "needs_review";
  }
  if (!snap.date) return verdictForMandatory(false, snap.analysisStatus);
  if (snap.date !== gt.date) {
    const parsed = parseDate(snap.date);
    if (parsed.normalized === gt.date) return "correct";
    return verdictForMandatory(false, snap.analysisStatus);
  }
  return "correct";
}

function evaluateTime(
  snap: ReceiptPipelineSnapshot,
  gt: ReceiptGroundTruth
): FieldVerdict {
  if (!gt.time) {
    return snap.time ? "correct" : "needs_review";
  }
  const actual = normalizeTimeForCompare(snap.time);
  const expected = normalizeTimeForCompare(gt.time);
  if (!actual) return verdictForMandatory(false, snap.analysisStatus);
  return verdictForMandatory(actual === expected, snap.analysisStatus);
}

function evaluateTotal(
  snap: ReceiptPipelineSnapshot,
  gt: ReceiptGroundTruth
): FieldVerdict {
  return verdictForMandatory(moneyMatch(snap.total, gt.total), snap.analysisStatus);
}

function evaluateProducts(
  snap: ReceiptPipelineSnapshot,
  gt: ReceiptGroundTruth
): { verdict: FieldVerdict; notes: string[] } {
  const notes: string[] = [];
  const names = snap.productNames.map((n) => n.trim()).filter(Boolean);
  const polluted = names.filter(isPollutedProductName);
  if (polluted.length > 0) {
    notes.push(`${polluted.length} polluted product name(s): ${polluted.slice(0, 3).join(", ")}`);
  }

  if (gt.productNameHints?.length) {
    const missing = gt.productNameHints.filter(
      (hint) => !names.some((n) => containsFolded(n, hint))
    );
    if (missing.length > 0) {
      notes.push(`missing expected product hints: ${missing.join(", ")}`);
    }
  }

  const pricedCount = snap.productLineTotals.filter(
    (v) => v != null && Number.isFinite(v)
  ).length;
  if (gt.productCount != null && pricedCount < Math.min(gt.productCount, names.length)) {
    notes.push(
      `priced lines ${pricedCount} < expected ~${gt.productCount} (names=${names.length})`
    );
  }

  if (gt.fuelQty != null && snap.fuel?.liters != null) {
    if (!nearlyEqual(snap.fuel.liters, gt.fuelQty, 0.05)) {
      notes.push(`fuel qty ${snap.fuel.liters} != ${gt.fuelQty}`);
    }
  }
  if (gt.fuelUnitPrice != null && snap.fuel?.pricePerLiter != null) {
    if (!nearlyEqual(snap.fuel.pricePerLiter, gt.fuelUnitPrice, 0.05)) {
      notes.push(
        `fuel unit price ${snap.fuel.pricePerLiter} != ${gt.fuelUnitPrice}`
      );
    }
  }
  if (gt.plateContains && snap.fuel?.plate) {
    if (!containsFolded(snap.fuel.plate.replace(/\s/g, ""), gt.plateContains)) {
      notes.push(`plate ${snap.fuel.plate} missing ${gt.plateContains}`);
    }
  }

  const hasPollution = polluted.length > 0;
  const hintsOk =
    !gt.productNameHints?.length ||
    gt.productNameHints.some((hint) => names.some((n) => containsFolded(n, hint)));
  const pricedOk =
    gt.productCount == null ||
    pricedCount >= Math.min(1, gt.productCount) ||
    snap.analysisStatus !== "approved";

  const ok = !hasPollution && hintsOk && pricedOk;
  return {
    verdict: verdictForMandatory(ok, snap.analysisStatus),
    notes,
  };
}

function evaluatePayment(
  snap: ReceiptPipelineSnapshot,
  gt: ReceiptGroundTruth
): FieldVerdict {
  if (gt.paymentAmount == null) {
    return snap.paymentAmounts.length === 0 ? "needs_review" : "correct";
  }
  const sum = snap.paymentAmounts.reduce<number>(
    (acc, v) => acc + (v ?? 0),
    0
  );
  if (sum <= 0) return verdictForMandatory(false, snap.analysisStatus);
  return verdictForMandatory(moneyMatch(sum, gt.paymentAmount), snap.analysisStatus);
}

export function evaluateContractReport(
  snap: ReceiptPipelineSnapshot,
  gt: ReceiptGroundTruth
): ContractReport {
  const notes: string[] = [];
  const merchantEval = evaluateMerchant(snap, gt);
  notes.push(...merchantEval.notes);

  const productsEval = evaluateProducts(snap, gt);
  notes.push(...productsEval.notes);

  const merchant = merchantEval.verdict;
  const category = evaluateCategory(snap, gt);
  const date = evaluateDate(snap, gt);
  const time = evaluateTime(snap, gt);
  const total = evaluateTotal(snap, gt);
  const products = productsEval.verdict;
  const payment = evaluatePayment(snap, gt);

  const mandatory: FieldVerdict[] = [
    merchant,
    category,
    date,
    time,
    total,
    products,
    payment,
  ];
  const falseApproval =
    snap.analysisStatus === "approved" &&
    mandatory.some((v) => v === "incorrect");

  if (falseApproval) {
    notes.push("false approval: approved with incorrect mandatory field");
  }

  return {
    id: gt.id,
    name: gt.name,
    merchant,
    category,
    date,
    time,
    total,
    products,
    payment,
    analysisStatus: snap.analysisStatus,
    falseApproval,
    notes,
  };
}
