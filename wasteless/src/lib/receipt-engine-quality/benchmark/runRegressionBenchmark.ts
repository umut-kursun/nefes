import {
  loadRealReceiptLayout,
  loadRealReceiptOcr,
  loadRealReceiptPurchase,
  loadRealReceiptValidation,
  REAL_RECEIPT_CATALOG,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { buildConfidenceModel } from "../confidence/buildConfidenceModel";
import { collectPerformanceMetrics } from "../performance/collectPerformanceMetrics";
import { runQualityPipelineFromOcr } from "../runQualityPipeline";
import type { RegressionReceiptResult, RegressionRunSummary } from "../types";

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Run regression benchmark over real receipt corpus. */
export function runRegressionBenchmark(): RegressionRunSummary {
  const receipts: RegressionReceiptResult[] = [];

  for (const ref of REAL_RECEIPT_CATALOG) {
    const ocr = loadRealReceiptOcr(ref);
    const outputs = runQualityPipelineFromOcr(ocr, { collectTimings: true });
    const goldenLayout = loadRealReceiptLayout(ref);
    const goldenPurchase = loadRealReceiptPurchase(ref);
    const goldenValidation = loadRealReceiptValidation(ref);
    const confidence = buildConfidenceModel(outputs);

    const layoutMatch = deepEqual(outputs.layout, goldenLayout);
    const purchaseMatch = deepEqual(outputs.purchase, goldenPurchase);
    const validationGolden = {
      isValid: goldenValidation.isValid,
      score: goldenValidation.score,
      errors: goldenValidation.errors,
      warnings: goldenValidation.warnings,
    };
    const validationActual = {
      isValid: outputs.validation.isValid,
      score: outputs.validation.score,
      errors: outputs.validation.errors,
      warnings: outputs.validation.warnings,
    };
    const validationMatch = deepEqual(validationActual, validationGolden);

    receipts.push({
      slug: ref.merchant,
      name: ref.name,
      layoutMatch,
      purchaseMatch,
      validationMatch,
      confidence: confidence.overall,
      validationErrors: outputs.validation.errors.length,
      timings: outputs.timings,
    });
  }

  const passCount = receipts.filter(
    (r) => r.layoutMatch && r.purchaseMatch && r.validationMatch
  ).length;
  const performance = collectPerformanceMetrics(receipts.map((r) => r.timings));

  return {
    generatedAt: new Date().toISOString(),
    receiptCount: receipts.length,
    passRate: receipts.length ? passCount / receipts.length : 0,
    layoutPassRate:
      receipts.filter((r) => r.layoutMatch).length / (receipts.length || 1),
    purchasePassRate:
      receipts.filter((r) => r.purchaseMatch).length / (receipts.length || 1),
    validationPassRate:
      receipts.filter((r) => r.validationMatch).length / (receipts.length || 1),
    avgConfidence:
      receipts.reduce((s, r) => s + r.confidence, 0) / (receipts.length || 1),
    avgValidationScore: 0,
    totalValidationErrors: receipts.reduce(
      (s, r) => s + r.validationErrors,
      0
    ),
    receipts,
    performance,
  };
}
