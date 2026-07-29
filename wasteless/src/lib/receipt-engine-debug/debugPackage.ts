import JSZip from "jszip";
import type { ReceiptDebugExport } from "@/lib/receipt-engine-debug/exportSchema";
import { formatDebugExportJson } from "@/lib/receipt-engine-debug/buildExport";

function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = /^data:[^;]+;base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid image data URL.");
  }
  return Buffer.from(match[1], "base64");
}

export async function buildDebugPackageZip(
  debugExport: ReceiptDebugExport,
  imageDataUrl: string
): Promise<Buffer> {
  const zip = new JSZip();

  zip.file("receipt.jpg", dataUrlToBuffer(imageDataUrl));
  zip.file("receipt-debug.json", `${formatDebugExportJson(debugExport)}\n`);
  zip.file("ocr.txt", debugExport.ocr.rawText);
  zip.file(
    "validation.json",
    `${JSON.stringify(debugExport.validation, null, 2)}\n`
  );
  zip.file(
    "purchase.json",
    `${JSON.stringify(debugExport.purchase, null, 2)}\n`
  );
  zip.file(
    "timings.json",
    `${JSON.stringify(debugExport.timings, null, 2)}\n`
  );

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
