import type {
  ValidationIssue,
  ValidationSeverity,
  ValidatorResult,
} from "../../types/models/validation";

export const SCORE_BY_SEVERITY: Readonly<Record<ValidationSeverity, number>> = {
  INFO: 0,
  WARNING: -5,
  ERROR: -15,
  CRITICAL: -25,
};

export const CONFIDENCE_BY_SEVERITY: Readonly<Record<ValidationSeverity, number>> = {
  INFO: 0,
  WARNING: -0.05,
  ERROR: -0.15,
  CRITICAL: -0.25,
};

export function impactFromIssues(issues: readonly ValidationIssue[]): {
  scoreImpact: number;
  confidenceImpact: number;
} {
  let scoreImpact = 0;
  let confidenceImpact = 0;
  for (const issue of issues) {
    scoreImpact += SCORE_BY_SEVERITY[issue.severity];
    confidenceImpact += CONFIDENCE_BY_SEVERITY[issue.severity];
  }
  return { scoreImpact, confidenceImpact };
}

export function buildValidatorResult(
  validatorId: string,
  phase: ValidatorResult["phase"],
  issues: ValidationIssue[]
): ValidatorResult {
  const impact = impactFromIssues(issues);
  return {
    validatorId,
    phase,
    issues,
    scoreImpact: impact.scoreImpact,
    confidenceImpact: impact.confidenceImpact,
  };
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function partitionIssues(issues: readonly ValidationIssue[]): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const info: ValidationIssue[] = [];

  for (const issue of issues) {
    if (issue.severity === "ERROR" || issue.severity === "CRITICAL") {
      errors.push(issue);
    } else if (issue.severity === "WARNING") {
      warnings.push(issue);
    } else {
      info.push(issue);
    }
  }

  return { errors, warnings, info };
}

export function isReportValid(errors: readonly ValidationIssue[]): boolean {
  return errors.length === 0;
}
