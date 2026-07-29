import type { LayerId } from "./layer";

export type IssueSeverity = "info" | "warning" | "error" | "fatal";

export type IssueCode =
  | "LAYER_NOT_IMPLEMENTED"
  | "IMAGE_INVALID"
  | "OCR_FAILED"
  | "OCR_EMPTY"
  | "LAYOUT_EMPTY"
  | "GRAPH_EMPTY"
  | "NO_PRODUCTS"
  | "TOTAL_MISMATCH"
  | "VALIDATION_BLOCKED"
  | "AI_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface PipelineIssue {
  code: IssueCode;
  severity: IssueSeverity;
  layer: LayerId;
  message: string;
  field?: string;
  expected?: number;
  actual?: number;
  nodeIds?: string[];
  recoverable: boolean;
}

export function createLayerStubIssue(layer: LayerId): PipelineIssue {
  return {
    code: "LAYER_NOT_IMPLEMENTED",
    severity: "info",
    layer,
    message: `${layer} is a stub — parsing logic not yet implemented.`,
    recoverable: true,
  };
}
