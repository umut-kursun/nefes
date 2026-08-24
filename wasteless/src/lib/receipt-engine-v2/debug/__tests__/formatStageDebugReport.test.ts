import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatStageDebugReport } from "../formatStageDebugReport";
import { runReceiptEngineV2 } from "../../engine/runReceiptEngineV2";
import { parseVisionResult } from "../../vision/parseVisionResult";

function loadFixture(relativePath: string) {
  const lines = readFileSync(join(process.cwd(), relativePath), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
  const vision = parseVisionResult({
    rawText: lines.join("\n"),
    lines,
    merchant: { rawName: lines[0] ?? null },
    metadata: {
      purchaseDate: "29.07.2026",
      purchaseTime: "16:00",
      receiptNumber: "123456",
    },
  });
  return runReceiptEngineV2(vision);
}

describe("formatStageDebugReport", () => {
  it("prints pipeline stages in order without JSON dumps", () => {
    const engineResult = loadFixture(
      "src/lib/receipt-engine-v2/tests/golden/fixtures/cases/migros-ortak-pos/ocr.txt"
    );

    const report = formatStageDebugReport({
      engineResult,
      validation: {
        isValid: true,
        consistent: true,
        score: 100,
        errors: [],
        warnings: [],
        info: [],
      },
      stageTimings: {
        engine: "v2",
        ocrMs: 1200,
        purchaseDraftMs: 4,
        totalMs: 1300,
      },
    });

    const sections = [
      "VISION",
      "OCR LINES",
      "TOKENIZER",
      "CLASSIFICATION",
      "PRODUCT BLOCKS",
      "PARSED PRODUCTS",
      "FOOTER",
      "FINAL PURCHASE",
      "VALIDATION",
      "PERFORMANCE",
    ];

    let lastIndex = -1;
    for (const section of sections) {
      const marker = `==================== ${section} ====================`;
      const index = report.indexOf(marker);
      expect(index, section).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }

    expect(report).toContain("[00] MIGROS TICARET A.S.");
    expect(report).toContain("merchant_header");
    expect(report).toContain("BLOCK #1");
    expect(report).toContain("rawName:\nEKMEK 750 GR");
    expect(report).toContain("merchant:\nMIGROS TICARET A.S.");
    expect(report).not.toContain('"purchase"');
    expect(report).not.toContain("{");
  });
});
