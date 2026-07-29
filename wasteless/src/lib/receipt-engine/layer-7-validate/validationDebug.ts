import type { ValidationIssue, ValidationReport } from "../types/models/validation";
import { stripValidatedPurchase } from "./stripValidatedPurchase";

export interface ValidationInspection {
  issue: ValidationIssue;
  validatorId: string;
  severity: string;
  locationPath: string;
}

export function inspectValidation(
  report: ValidationReport,
  issueId: string
): ValidationInspection | null {
  const all = [...report.errors, ...report.warnings, ...report.info];
  const issue = all.find((item) => item.id === issueId);
  if (!issue) return null;

  return {
    issue,
    validatorId: issue.provenance.validatorId,
    severity: issue.severity,
    locationPath: issue.location.path,
  };
}

export function formatValidationDebug(report: ValidationReport): string {
  const lines = [
    `ValidationReport isValid=${report.isValid} score=${report.score}`,
    `  errors=${report.errors.length} warnings=${report.warnings.length} info=${report.info.length}`,
    `  confidenceAdjustment=${report.confidenceAdjustment.toFixed(3)}`,
    `  purchaseConfidence=${report.provenance.purchaseConfidence.toFixed(2)}`,
    "",
    "structural validators:",
    ...report.provenance.structuralValidators.map((id) => `  - ${id}`),
    "",
    "business validators:",
    ...report.provenance.businessValidators.map((id) => `  - ${id}`),
    "",
    "errors:",
  ];

  for (const issue of report.errors) {
    lines.push(formatIssueLine(issue));
  }

  lines.push("", "warnings:");
  for (const issue of report.warnings) {
    lines.push(formatIssueLine(issue));
  }

  lines.push("", "info:");
  for (const issue of report.info) {
    lines.push(formatIssueLine(issue));
  }

  return lines.join("\n");
}

function formatIssueLine(issue: ValidationIssue): string {
  const loc = issue.location.index !== undefined
    ? `${issue.location.path}[${issue.location.index}]`
    : issue.location.path;
  return `  [${issue.severity}] ${issue.code} @ ${loc} — ${issue.message}`;
}

export function validationReportToJson(report: ValidationReport): string {
  const serializable = stripValidatedPurchase(report);
  return JSON.stringify(
    {
      ...serializable,
      validatedPurchaseRef: report.validatedPurchase.provenance.metadataBlockId,
    },
    null,
    2
  );
}
