import { describe, expect, it } from "vitest";
import {
  REAL_RECEIPT_CATALOG,
  loadRealReceiptOcr,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { buildFieldExplanations } from "../explain/buildFieldExplanations";
import { runQualityPipelineFromOcr } from "../runQualityPipeline";

describe("Field explanations", () => {
  it("explains merchant with source lines for Migros", () => {
    const ref = REAL_RECEIPT_CATALOG.find((r) => r.merchant === "migros-ortak-pos")!;
    const outputs = runQualityPipelineFromOcr(loadRealReceiptOcr(ref));
    const explanations = buildFieldExplanations(outputs);

    expect(explanations.merchant).not.toBeNull();
    expect(explanations.merchant!.sourceLines.length).toBeGreaterThan(0);
    expect(explanations.merchant!.reason).toMatch(/merchantScorer/i);
    expect(explanations.products.length).toBeGreaterThan(0);
    expect(explanations.products[0]!.reason).toMatch(/PRODUCTS|fuel|Promoted/i);
  });

  it("explains fuel products for Shell", () => {
    const ref = REAL_RECEIPT_CATALOG.find((r) => r.merchant === "shell-motorin")!;
    const outputs = runQualityPipelineFromOcr(loadRealReceiptOcr(ref));
    const explanations = buildFieldExplanations(outputs);

    expect(explanations.fuel.length).toBeGreaterThan(0);
  });
});
