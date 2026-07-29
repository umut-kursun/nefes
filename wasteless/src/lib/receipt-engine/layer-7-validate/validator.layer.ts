import type { PurchaseDraft } from "../types/models/purchase";
import type { ValidationReport } from "../types/models/validation";
import type { LayerResult, ReceiptEngineLayer } from "../types/layer";
import { createLayerMetrics } from "../types/layer";
import { clampConfidence } from "../types/provenance";
import { buildValidationReport } from "./buildValidationReport";

export type Layer7Input = PurchaseDraft;
export type Layer7Output = ValidationReport;

export const layer7Validate: ReceiptEngineLayer<Layer7Input, Layer7Output> = {
  id: "L7_VALIDATE",

  async run(input, ctx): Promise<LayerResult<Layer7Output>> {
    void ctx;
    const output = buildValidationReport(input);
    return {
      output,
      issues: [],
      metrics: createLayerMetrics(0, clampConfidence(output.overallConfidence)),
    };
  },
};
