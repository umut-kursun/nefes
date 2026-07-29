import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildDebugPackageZip } from "@/lib/receipt-engine-debug/debugPackage";
import type { ReceiptDebugExport } from "@/lib/receipt-engine-debug/exportSchema";

const sampleExport: ReceiptDebugExport = {
  version: {
    engineVersion: "2.0.0-alpha",
    schemaVersion: "1.0.0",
    buildVersion: "0.0.27",
    gitCommit: null,
  },
  timestamp: "2026-07-29T12:00:00.000Z",
  image: { width: 100, height: 200, sizeBytes: 16 },
  ocr: {
    provider: "openai",
    model: "gpt-4o-mini",
    durationMs: 42,
    quality: { charCount: 4, lineCount: 1, score: 1 },
    rawText: "TEST",
    lines: ["TEST"],
  },
  layout: {},
  graph: {},
  classification: {},
  blocks: {},
  purchase: { products: [] },
  validation: { isValid: true, score: 100, errors: [], warnings: [] },
  timings: {
    uploadMs: 1,
    ocrMs: 42,
    layoutMs: 2,
    graphMs: 3,
    classificationMs: 4,
    blockMs: 5,
    purchaseMs: 6,
    validationMs: 7,
    totalMs: 70,
  },
};

describe("buildDebugPackageZip", () => {
  it("includes required debug package files", async () => {
    const imageDataUrl =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//2wBDAf//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//Af//wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==";

    const zipBuffer = await buildDebugPackageZip(sampleExport, imageDataUrl);
    const zip = await JSZip.loadAsync(zipBuffer);

    expect(Object.keys(zip.files).sort()).toEqual([
      "ocr.txt",
      "purchase.json",
      "receipt-debug.json",
      "receipt.jpg",
      "timings.json",
      "validation.json",
    ]);
    expect(await zip.file("ocr.txt")?.async("string")).toBe("TEST");
  });
});
