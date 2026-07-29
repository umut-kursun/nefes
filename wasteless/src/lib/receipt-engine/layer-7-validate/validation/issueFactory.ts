import type { PurchaseDraft } from "../../types/models/purchase";
import type {
  ValidationCategory,
  ValidationIssue,
  ValidationSeverity,
} from "../../types/models/validation";

export const MONEY_TOLERANCE = 0.02;

export function nearlyEqual(a: number, b: number, tolerance = MONEY_TOLERANCE): boolean {
  return Math.abs(a - b) <= tolerance;
}

export function sumAmounts(values: Array<number | undefined>): number {
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function createIssue(params: {
  validatorId: string;
  category: ValidationCategory;
  code: string;
  severity: ValidationSeverity;
  message: string;
  path: string;
  index?: number;
  field?: string;
  suggestedFix?: string;
  expected?: number;
  actual?: number;
  graphNodeIds?: readonly string[];
  purchase: PurchaseDraft;
}): ValidationIssue {
  const location = {
    path: params.path,
    ...(params.index !== undefined ? { index: params.index } : {}),
    ...(params.field ? { field: params.field } : {}),
  };

  return {
    id: `${params.validatorId}:${params.code}:${params.path}${
      params.index !== undefined ? `[${params.index}]` : ""
    }`,
    severity: params.severity,
    category: params.category,
    code: params.code,
    message: params.message,
    location,
    provenance: {
      validatorId: params.validatorId,
      purchaseConfidence: params.purchase.confidence,
      ...(params.graphNodeIds ? { graphNodeIds: params.graphNodeIds } : {}),
    },
    ...(params.suggestedFix ? { suggestedFix: params.suggestedFix } : {}),
    ...(params.expected !== undefined ? { expected: params.expected } : {}),
    ...(params.actual !== undefined ? { actual: params.actual } : {}),
  };
}
