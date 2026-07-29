import type { ValidationReport } from "../types/models/validation";

export type ValidationReportGolden = Omit<ValidationReport, "validatedPurchase">;

export function stripValidatedPurchase(
  report: ValidationReport
): ValidationReportGolden {
  return {
    isValid: report.isValid,
    consistent: report.consistent,
    score: report.score,
    errors: report.errors,
    warnings: report.warnings,
    info: report.info,
    confidenceAdjustment: report.confidenceAdjustment,
    overallConfidence: report.overallConfidence,
    provenance: report.provenance,
    blocking: report.blocking,
  };
}
