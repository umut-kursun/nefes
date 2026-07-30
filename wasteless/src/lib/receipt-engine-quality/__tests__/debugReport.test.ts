import { describe, expect, it } from "vitest";
import {
  REAL_RECEIPT_CATALOG,
  loadRealReceiptOcr,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { buildDebugReport } from "../report/buildDebugReport";
import { runQualityPipelineFromOcr } from "../runQualityPipeline";

describe("Debug report", () => {
  it("includes sections, rejections, and validation for real receipts", () => {
    for (const ref of REAL_RECEIPT_CATALOG) {
      const outputs = runQualityPipelineFromOcr(loadRealReceiptOcr(ref));
      const report = buildDebugReport(outputs, { receiptId: ref.merchant });

      expect(report.sections.length).toBeGreaterThan(0);
      expect(report.semanticLineTypes.length).toBe(outputs.layout.lines.length);
      expect(report.confidence.overall).toBeGreaterThanOrEqual(0);
      expect(report.fieldExplanations.products.length).toBe(
        outputs.purchase.products.length
      );
      expect(Array.isArray(report.rejectedCandidates)).toBe(true);
    }
  });
});
