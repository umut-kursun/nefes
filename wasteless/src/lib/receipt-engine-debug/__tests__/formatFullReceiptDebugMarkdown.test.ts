import { describe, expect, it } from "vitest";
import { formatFullReceiptDebugMarkdown } from "@/lib/receipt-engine-debug/formatFullReceiptDebugMarkdown";
import type { ReceiptDebugExport } from "@/lib/receipt-engine-debug/exportSchema";
import { APP_VERSION } from "@/lib/app-version";

const RAW_VISION = '{"rawText":"RAW LINE\\nWITH SPACES  ","lines":[{"text":"RAW LINE","confidence":0.9}]}';

const sampleExport: ReceiptDebugExport = {
  version: {
    engineVersion: "2.0.0-alpha",
    schemaVersion: "1.0.0",
    buildVersion: "0.0.27",
    gitCommit: null,
  },
  timestamp: "2026-07-29T12:00:00.000Z",
  image: {
    width: 800,
    height: 1200,
    sizeBytes: 4096,
    orientation: "portrait",
  },
  ocr: {
    provider: "openai",
    model: "gpt-4o-mini",
    durationMs: 42,
    quality: { charCount: 4, lineCount: 1, score: 1 },
    rawText: "NORMALIZED LINE",
    rawExtractText: "RAW LINE\nWITH SPACES  ",
    rawVisionResponse: RAW_VISION,
    lines: ["NORMALIZED LINE"],
  },
  layout: {
    profileId: "generic-tr",
    confidence: 0.85,
    readingOrder: [0],
    regions: { header: [0], body: [], footer: [] },
    segmentation: {
      sections: [{ kind: "header", startLineIndex: 0, endLineIndex: 0 }],
      sectionByLineIndex: ["header"],
      lineTypes: ["MerchantLine"],
      parserStates: ["HEADER"],
    },
    lines: [
      {
        index: 0,
        text: "SHOP",
        rawText: "SHOP",
        region: "header",
        sectionKind: "header",
        lineSemanticType: "MerchantLine",
        features: {
          hasVatToken: false,
          hasWeightPattern: false,
          hasQuantityToken: false,
          isAmountOnly: false,
          isLikelyContinuation: false,
          isRightAlignedPrice: false,
        },
        confidence: 0.9,
      },
      {
        index: 1,
        text: "MYSTERY",
        rawText: "MYSTERY",
        region: "body",
        sectionKind: "products",
        lineSemanticType: "UnknownLine",
        features: {
          hasVatToken: false,
          hasWeightPattern: false,
          hasQuantityToken: false,
          isAmountOnly: false,
          isLikelyContinuation: true,
          isRightAlignedPrice: false,
        },
        confidence: 0.4,
      },
    ],
  },
  graph: { nodes: [] },
  classification: { confidence: 0.8, nodes: [] },
  blocks: { blocks: [] },
  purchase: { merchant: "SHOP", products: [] },
  validation: { isValid: true, score: 95, errors: [], warnings: [] },
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
  confidence: {
    merchant: 0.81,
    overall: 0.75,
    rejectedLines: [
      { lineIndex: 1, text: "MYSTERY", reason: "Not promoted to purchase draft field" },
    ],
    unknownLines: [{ lineIndex: 1, text: "MYSTERY", sectionKind: "products" }],
  },
};

describe("formatFullReceiptDebugMarkdown", () => {
  it("includes all required sections in order", () => {
    const markdown = formatFullReceiptDebugMarkdown(sampleExport);

    expect(markdown.startsWith("==================================================\nRECEIPT DEBUG")).toBe(
      true
    );

    const sectionHeaders = [
      "## 1. Receipt image metadata",
      "## 2. Raw Vision response (UNMODIFIED)",
      "## 3. OCR text used by parser",
      "## 4. Layout reconstruction",
      "## 5. Parser JSON",
      "## 6. Validation",
      "## 7. Parser timeline",
      "## 8. Confidence",
      "## 9. Environment",
    ];

    let lastIndex = 0;
    for (const header of sectionHeaders) {
      const index = markdown.indexOf(header);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });

  it("passes raw Vision response through unchanged", () => {
    const markdown = formatFullReceiptDebugMarkdown(sampleExport);
    const sectionStart = markdown.indexOf("## 2. Raw Vision response (UNMODIFIED)");
    const sectionEnd = markdown.indexOf("## 3. OCR text used by parser");
    const rawBlock = markdown.slice(sectionStart, sectionEnd);

    expect(rawBlock).toContain(RAW_VISION);
    expect(rawBlock).not.toContain("NORMALIZED LINE");
  });

  it("shows raw and normalized OCR when they differ", () => {
    const markdown = formatFullReceiptDebugMarkdown(sampleExport);

    expect(markdown).toContain("### Raw OCR");
    expect(markdown).toContain("RAW LINE\nWITH SPACES  ");
    expect(markdown).toContain("### Normalized OCR");
    expect(markdown).toContain("NORMALIZED LINE");
  });

  it("includes layout reconstruction details", () => {
    const markdown = formatFullReceiptDebugMarkdown(sampleExport);

    expect(markdown).toContain('"continuations"');
    expect(markdown).toContain('"detectedSections"');
    expect(markdown).toContain('"sectionTransitions"');
  });

  it("includes confidence and environment metadata", () => {
    const markdown = formatFullReceiptDebugMarkdown(sampleExport);

    expect(markdown).toContain("Merchant confidence: 0.810");
    expect(markdown).toContain("Overall confidence: 0.750");
    expect(markdown).toContain("L1: MYSTERY");
    expect(markdown).toContain(`App version: ${APP_VERSION}`);
    expect(markdown).toContain("Vision model: gpt-4o-mini");
    expect(markdown).toContain("orientation: portrait");
  });

  it("includes parser timeline stages with timings", () => {
    const markdown = formatFullReceiptDebugMarkdown(sampleExport);

    expect(markdown).toContain("- OCR (42 ms)");
    expect(markdown).toContain("- Layout (2 ms)");
    expect(markdown).toContain("- Segmentation");
    expect(markdown).toContain("- Validation (7 ms)");
  });
});
