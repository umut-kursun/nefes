import type { ReceiptResult } from "../types";

export function exportQualityReport(result: ReceiptResult): string {
  const report = {
    generatedAt: new Date().toISOString(),
    success: result.success,
    confidence: result.confidence,
    validation: {
      isValid: result.validation.isValid,
      score: result.validation.score,
      errorCount: result.validation.errors.length,
      warningCount: result.validation.warnings.length,
    },
    performance: result.performance,
    debugSummary: {
      sectionCount: result.debugReport.sections.length,
      rejectedCandidateCount: result.debugReport.rejectedCandidates.length,
      productCount: result.purchase.products.length,
      paymentCount: result.purchase.payments.length,
    },
    versions: result.versions,
  };

  return `${JSON.stringify(report, null, 2)}\n`;
}
