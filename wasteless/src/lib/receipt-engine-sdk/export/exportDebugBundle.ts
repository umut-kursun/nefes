import JSZip from "jszip";
import type { ReceiptResult } from "../types";

export async function exportDebugBundle(result: ReceiptResult): Promise<Buffer> {
  const zip = new JSZip();

  zip.file("purchase.json", `${JSON.stringify(result.purchase, null, 2)}\n`);
  zip.file("validation.json", `${JSON.stringify(result.validation, null, 2)}\n`);
  zip.file("debug-report.json", `${JSON.stringify(result.debugReport, null, 2)}\n`);
  zip.file("confidence.json", `${JSON.stringify(result.confidence, null, 2)}\n`);
  zip.file("performance.json", `${JSON.stringify(result.performance, null, 2)}\n`);
  zip.file("ocr-raw.txt", result.rawOcr.rawText);
  zip.file("ocr-normalized.txt", result.normalizedOcr.rawText);
  zip.file("versions.json", `${JSON.stringify(result.versions, null, 2)}\n`);

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
