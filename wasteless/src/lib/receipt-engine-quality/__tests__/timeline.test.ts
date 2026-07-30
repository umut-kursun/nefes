import { describe, expect, it } from "vitest";
import {
  REAL_RECEIPT_CATALOG,
  loadRealReceiptOcr,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { runQualityPipelineFromOcr } from "../runQualityPipeline";
import { buildParserTimeline } from "../timeline/buildParserTimeline";

describe("Parser timeline", () => {
  it("builds 10 inspectable stages for each real receipt", () => {
    for (const ref of REAL_RECEIPT_CATALOG) {
      const ocr = loadRealReceiptOcr(ref);
      const outputs = runQualityPipelineFromOcr(ocr);
      const timeline = buildParserTimeline(outputs);

      expect(timeline.stages).toHaveLength(10);
      expect(timeline.stages.every((s) => s.inspectable)).toBe(true);
      expect(timeline.stages.map((s) => s.id)).toEqual([
        "receipt-photo",
        "ocr",
        "normalized-ocr",
        "layout",
        "document-segmentation",
        "semantic-line-classification",
        "graph",
        "blocks",
        "purchase-draft",
        "validation",
      ]);
    }
  });
});
