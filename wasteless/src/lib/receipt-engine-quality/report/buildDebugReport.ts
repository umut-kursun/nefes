import { buildConfidenceModel } from "../confidence/buildConfidenceModel";
import { buildFieldExplanations } from "../explain/buildFieldExplanations";
import type { QualityPipelineOutputs, ReceiptDebugReport } from "../types";
import { buildRejectedCandidates } from "./buildRejectedCandidates";

export type BuildDebugReportOptions = {
  readonly receiptId: string;
  readonly generatedAt?: string;
};

/** Build visual debug report JSON from pipeline outputs. */
export function buildDebugReport(
  outputs: QualityPipelineOutputs,
  options: BuildDebugReportOptions
): ReceiptDebugReport {
  const { layout, validation } = outputs;
  const confidence = buildConfidenceModel(outputs);
  const fieldExplanations = buildFieldExplanations(outputs);
  const rejectedCandidates = buildRejectedCandidates(layout, outputs.purchase);

  const sections = layout.segmentation.sections.map((s) => ({
    kind: s.kind,
    startLineIndex: s.startLineIndex,
    endLineIndex: s.endLineIndex,
  }));

  const semanticLineTypes = layout.lines.map((line) => ({
    lineIndex: line.index,
    type: line.lineSemanticType,
    text: line.text,
  }));

  const parserStateTransitions = layout.segmentation.parserStates.map(
    (state, lineIndex) => ({
      lineIndex,
      state,
    })
  );

  return {
    receiptId: options.receiptId,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    sections,
    semanticLineTypes,
    parserStateTransitions,
    confidence,
    fieldExplanations,
    validation: {
      isValid: validation.isValid,
      score: validation.score,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      errors: validation.errors.map((e) => ({
        code: e.code,
        message: e.message,
      })),
      warnings: validation.warnings.map((e) => ({
        code: e.code,
        message: e.message,
      })),
    },
    rejectedCandidates,
    timings: outputs.timings,
  };
}
