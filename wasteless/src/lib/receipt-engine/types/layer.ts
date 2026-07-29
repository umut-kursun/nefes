import type { PipelineIssue } from "./issues";
import type { Confidence } from "./provenance";

export type LayerId =
  | "L0_IMAGE"
  | "L1_OCR"
  | "L2_LAYOUT"
  | "L3_GRAPH"
  | "L4_CLASSIFY"
  | "L5_BLOCKS"
  | "L6_PURCHASE"
  | "L7_VALIDATE"
  | "L8_KNOWLEDGE"
  | "L9_EXPENSE";

/** Ordered execution sequence — do not reorder without architecture review. */
export const LAYER_ORDER: readonly LayerId[] = [
  "L0_IMAGE",
  "L1_OCR",
  "L2_LAYOUT",
  "L3_GRAPH",
  "L4_CLASSIFY",
  "L5_BLOCKS",
  "L6_PURCHASE",
  "L7_VALIDATE",
  "L8_KNOWLEDGE",
  "L9_EXPENSE",
] as const;

export interface LayerMetrics {
  durationMs: number;
  aiInvoked: boolean;
  confidence: Confidence;
}

export interface LayerResult<TOutput> {
  output: TOutput;
  issues: PipelineIssue[];
  metrics: LayerMetrics;
}

export interface LayerSnapshot {
  layerId: LayerId;
  durationMs: number;
  issues: PipelineIssue[];
  /** JSON-serializable layer output for debug traces. */
  output: unknown;
}

export interface EngineDebugTrace {
  engineVersion: string;
  startedAt: string;
  finishedAt?: string;
  snapshots: LayerSnapshot[];
}

export interface LayerContext {
  readonly engineVersion: string;
  readonly debug: boolean;
  readonly trace: EngineDebugTrace;
  readonly deps: import("../pipeline/dependencies").EngineDependencies;
  readonly signal?: AbortSignal;
}

/** Contract every pipeline layer must implement. */
export interface ReceiptEngineLayer<TInput, TOutput> {
  readonly id: LayerId;
  run(input: TInput, ctx: LayerContext): Promise<LayerResult<TOutput>>;
}

export function createLayerMetrics(
  durationMs: number,
  confidence: Confidence,
  aiInvoked = false
): LayerMetrics {
  return { durationMs, confidence, aiInvoked };
}
