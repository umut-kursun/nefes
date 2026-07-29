import type { OcrDocument } from "../types/models/image";
import type { PurchaseDraft } from "../types/models/purchase";
import type { EngineDependencies } from "../pipeline/dependencies";
import { reconstructLayout } from "../layer-2-layout/layoutReconstructor";
import { buildReceiptGraph } from "../layer-3-graph/buildReceiptGraph";
import { buildClassifiedGraph } from "../layer-4-classify/buildClassifiedGraph";
import { buildBlockDocument } from "../layer-5-blocks/buildBlockDocument";
import { buildPurchaseDraft } from "../layer-6-purchase/buildPurchaseDraft";

/** Runs L2–L6 on a normalized OcrDocument — layers unchanged, no provider leakage. */
export function runPipelineFromOcr(
  ocr: OcrDocument,
  deps: EngineDependencies
): PurchaseDraft {
  const profile = deps.layoutProfiles.resolve(ocr.rawText);
  const layout = reconstructLayout(ocr, profile.id);
  const graph = buildReceiptGraph(layout);
  const classified = buildClassifiedGraph(graph);
  const blocks = buildBlockDocument(classified);
  return buildPurchaseDraft(blocks);
}
