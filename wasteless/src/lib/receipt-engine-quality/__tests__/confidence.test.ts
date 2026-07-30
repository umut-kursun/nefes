import { describe, expect, it } from "vitest";
import {
  REAL_RECEIPT_CATALOG,
  loadRealReceiptOcr,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { buildConfidenceModel } from "../confidence/buildConfidenceModel";
import { runQualityPipelineFromOcr } from "../runQualityPipeline";

describe("Confidence model", () => {
  it("produces breakdown with overall in [0,1]", () => {
    for (const ref of REAL_RECEIPT_CATALOG) {
      const outputs = runQualityPipelineFromOcr(loadRealReceiptOcr(ref));
      const model = buildConfidenceModel(outputs);

      expect(model.overall).toBeGreaterThanOrEqual(0);
      expect(model.overall).toBeLessThanOrEqual(1);
      expect(model.merchant).toBeGreaterThanOrEqual(0);
      expect(model.products).toBeGreaterThanOrEqual(0);
      expect(model.purchase).toBe(outputs.purchase.confidence);
    }
  });
});
