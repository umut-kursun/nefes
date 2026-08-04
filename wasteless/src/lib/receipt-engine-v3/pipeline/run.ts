import { rawLinesFromText } from "../ocr/from-text";
import { analyzeLayout } from "../layout/analyze-layout";
import { classifySemanticBlocks } from "../semantic/classify-blocks";
import { detectReceiptProfile } from "../profile/detect-profile";
import { buildPurchaseGraph } from "../graph/build-purchase-graph";
import { validatePurchase } from "../validation/validate-purchase";
import type { PipelineDebug, PipelineResult } from "../types";

export type RunPipelineOptions = {
  debug?: boolean;
  lineConfidence?: number;
};

/** Full V3 semantic pipeline. */
export function runReceiptPipelineV3(
  rawText: string,
  options: RunPipelineOptions = {}
): PipelineResult {
  const raw = rawLinesFromText(rawText, options.lineConfidence ?? 0.85);
  const layout = analyzeLayout(raw.lines);
  const semantic = classifySemanticBlocks(layout.blocks);
  const profile = detectReceiptProfile(semantic);
  const graph = buildPurchaseGraph(semantic, profile);
  const validation = validatePurchase(graph.purchase);

  const debug: PipelineDebug | undefined = options.debug
    ? {
        rawLines: raw.lines,
        layoutBlocks: layout.blocks,
        semanticBlocks: semantic.blocks,
        graph,
        validation,
      }
    : undefined;

  const result: PipelineResult = {
    purchase: graph.purchase,
    validation,
    profile,
    ...(debug ? { debug } : {}),
  };

  return result;
}

export { rawLinesFromText } from "../ocr/from-text";
export { rawLinesFromOcrDocument } from "../ocr/from-text";
export type { PipelineResult, NormalizedPurchase, ValidationReport } from "../types";
