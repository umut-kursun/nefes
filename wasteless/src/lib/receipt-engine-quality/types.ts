import type { PipelineLayerTimings } from "@/lib/receipt-engine-debug/tracePipeline";
import type { ReceiptDebugImageMeta } from "@/lib/receipt-engine-debug/exportSchema";
import type { OcrDocument } from "@/lib/receipt-engine/types/models/image";
import type { LayoutDocument } from "@/lib/receipt-engine/types/models/layout";
import type { ReceiptGraph } from "@/lib/receipt-engine/types/models/graph";
import type { ClassifiedGraph } from "@/lib/receipt-engine/types/models/classify";
import type { BlockDocument } from "@/lib/receipt-engine/types/models/blocks";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReport } from "@/lib/receipt-engine/types/models/validation";
import type { Confidence } from "@/lib/receipt-engine/types/provenance";
import type {
  DocumentParserState,
  LineSemanticType,
  ReceiptSectionKind,
} from "@/lib/receipt-engine/types/models/sections";

/** Full L2–L7 pipeline output bundle for quality analysis. */
export interface QualityPipelineOutputs {
  readonly ocr: OcrDocument;
  readonly layout: LayoutDocument;
  readonly graph: ReceiptGraph;
  readonly classified: ClassifiedGraph;
  readonly blocks: BlockDocument;
  readonly purchase: PurchaseDraft;
  readonly validation: ValidationReport;
  readonly timings: Partial<PipelineLayerTimings>;
  readonly imageMeta?: ReceiptDebugImageMeta;
}

export interface ParserTimelineStage {
  readonly id: string;
  readonly label: string;
  readonly timestamp?: string;
  readonly durationMs?: number;
  readonly payload: unknown;
  readonly inspectable: true;
}

export interface ParserTimeline {
  readonly stages: readonly ParserTimelineStage[];
  readonly totalDurationMs?: number;
}

export interface FieldExplanation {
  readonly field: string;
  readonly value: unknown;
  readonly confidence: Confidence;
  readonly reason: string;
  readonly sourceLines: readonly { index: number; text: string }[];
  readonly sourceRules?: readonly string[];
}

export interface ReceiptFieldExplanations {
  readonly merchant: FieldExplanation | null;
  readonly products: readonly FieldExplanation[];
  readonly payments: readonly FieldExplanation[];
  readonly vat: readonly FieldExplanation[];
  readonly totals: readonly FieldExplanation[];
  readonly fuel: readonly FieldExplanation[];
  readonly metadata: readonly FieldExplanation[];
}

export interface ReceiptConfidenceBreakdown {
  readonly merchant: Confidence;
  readonly products: Confidence;
  readonly payments: Confidence;
  readonly vat: Confidence;
  readonly totals: Confidence;
  readonly fuel: Confidence;
  readonly metadata: Confidence;
  readonly layout: Confidence;
  readonly classification: Confidence;
  readonly blocks: Confidence;
  readonly purchase: Confidence;
  readonly validation: Confidence;
  readonly overall: Confidence;
}

export interface RejectedCandidateLine {
  readonly lineIndex: number;
  readonly text: string;
  readonly sectionKind: ReceiptSectionKind;
  readonly lineSemanticType: LineSemanticType;
  readonly reason: string;
}

export interface ReceiptDebugReport {
  readonly receiptId: string;
  readonly generatedAt: string;
  readonly sections: readonly {
    kind: ReceiptSectionKind;
    startLineIndex: number;
    endLineIndex: number;
  }[];
  readonly semanticLineTypes: readonly {
    lineIndex: number;
    type: LineSemanticType;
    text: string;
  }[];
  readonly parserStateTransitions: readonly {
    lineIndex: number;
    state: DocumentParserState;
  }[];
  readonly confidence: ReceiptConfidenceBreakdown;
  readonly fieldExplanations: ReceiptFieldExplanations;
  readonly validation: {
    readonly isValid: boolean;
    readonly score: number;
    readonly errorCount: number;
    readonly warningCount: number;
    readonly errors: readonly { code: string; message: string }[];
    readonly warnings: readonly { code: string; message: string }[];
  };
  readonly rejectedCandidates: readonly RejectedCandidateLine[];
  readonly timings?: Partial<PipelineLayerTimings>;
}

export interface PurchaseDiffChange {
  readonly path: string;
  readonly kind: "added" | "removed" | "changed";
  readonly before?: unknown;
  readonly after?: unknown;
}

export interface PurchaseDiff {
  readonly receiptId: string;
  readonly generatedAt: string;
  readonly hasChanges: boolean;
  readonly changes: readonly PurchaseDiffChange[];
  readonly summary: {
    readonly merchantChanged: boolean;
    readonly productCountDelta: number;
    readonly paymentCountDelta: number;
    readonly confidenceDelta: number;
    readonly validationChanged: boolean;
  };
}

export interface StagePerformanceStats {
  readonly avgMs: number;
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly sampleCount: number;
}

export interface PerformanceMetrics {
  readonly generatedAt: string;
  readonly receiptCount: number;
  readonly stages: Record<string, StagePerformanceStats>;
  readonly total: StagePerformanceStats;
}

export interface RegressionReceiptResult {
  readonly slug: string;
  readonly name: string;
  readonly layoutMatch: boolean;
  readonly purchaseMatch: boolean;
  readonly validationMatch: boolean;
  readonly confidence: Confidence;
  readonly validationErrors: number;
  readonly timings: Partial<PipelineLayerTimings>;
}

export interface RegressionRunSummary {
  readonly generatedAt: string;
  readonly receiptCount: number;
  readonly passRate: number;
  readonly layoutPassRate: number;
  readonly purchasePassRate: number;
  readonly validationPassRate: number;
  readonly avgConfidence: Confidence;
  readonly avgValidationScore: number;
  readonly totalValidationErrors: number;
  readonly receipts: readonly RegressionReceiptResult[];
  readonly performance: PerformanceMetrics;
}
