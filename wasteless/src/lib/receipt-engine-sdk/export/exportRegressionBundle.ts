import JSZip from "jszip";
import { runRegressionBenchmark } from "@/lib/receipt-engine-quality/benchmark/runRegressionBenchmark";
import type { ReceiptResult } from "../types";

export async function exportRegressionBundle(
  result?: ReceiptResult
): Promise<Buffer> {
  const summary = runRegressionBenchmark();
  const zip = new JSZip();

  zip.file("regression-summary.json", `${JSON.stringify(summary, null, 2)}\n`);

  if (result) {
    zip.file(
      "latest-result.json",
      `${JSON.stringify(
        {
          purchase: result.purchase,
          validation: result.validation,
          confidence: result.confidence,
          versions: result.versions,
        },
        null,
        2
      )}\n`
    );
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
