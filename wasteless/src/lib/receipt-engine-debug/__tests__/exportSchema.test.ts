import { describe, expect, it } from "vitest";
import { readImageDimensions } from "@/lib/receipt-engine-debug/imageDimensions";
import { buildReceiptDebugExport } from "@/lib/receipt-engine-debug/buildExport";
import { isDebugExportEnabled } from "@/lib/receipt-engine-debug/devGuard";
import { DEBUG_SCHEMA_VERSION } from "@/lib/receipt-engine-debug/versionInfo";
import type { PipelineTrace } from "@/lib/receipt-engine-debug/tracePipeline";

describe("readImageDimensions", () => {
  it("reads PNG IHDR dimensions", () => {
    const png = Buffer.alloc(24);
    png[0] = 0x89;
    png[1] = 0x50;
    png[2] = 0x4e;
    png[3] = 0x47;
    png[16] = 0;
    png[17] = 0;
    png[18] = 0x03;
    png[19] = 0x20;
    png[20] = 0;
    png[21] = 0;
    png[22] = 0x02;
    png[23] = 0x58;
    expect(readImageDimensions(new Uint8Array(png))).toEqual({
      width: 800,
      height: 600,
    });
  });
});

describe("buildReceiptDebugExport", () => {
  it("maps trace stages into canonical export shape", () => {
    const trace: PipelineTrace = {
      traceId: "trace-test",
      createdAt: "2026-07-29T12:00:00.000Z",
      sourceHint: "receipt",
      imageDataUrl: "data:image/jpeg;base64,abc",
      timings: {
        uploadMs: 1,
        ocrMs: 2,
        layoutMs: 3,
        graphMs: 4,
        classificationMs: 5,
        blockMs: 6,
        purchaseMs: 7,
        validationMs: 8,
        totalMs: 36,
      },
      stages: {
        ocr: {
          rawText: "LINE1\nLINE2",
          lines: ["LINE1", "LINE2"],
          source: "vision_primary",
          quality: { charCount: 10, lineCount: 2, score: 0.9 },
        },
        layout: {
          profileId: "generic-tr",
          lines: [],
          readingOrder: [],
          regions: { header: [], body: [], footer: [] },
          segmentation: {
            sections: [],
            sectionByLineIndex: [],
            lineTypes: [],
            parserStates: [],
          },
          confidence: 0.8,
        },
        receiptGraph: { nodes: [] },
        classifiedGraph: { confidence: 0.8, nodes: [] },
        blockDocument: { blocks: [] },
        purchaseDraft: {
          products: [],
          provenance: {},
          confidence: 0.8,
          payments: [],
          charges: [],
          discounts: [],
          vatSummary: [],
        },
        validationReport: { isValid: true, score: 90, errors: [], warnings: [] },
      },
      textDebug: {
        ocr: "",
        layout: "",
        receiptGraph: "",
        classifiedGraph: "",
        blockDocument: "",
        purchaseDraft: "",
        validationReport: "",
      },
    };

    const exported = buildReceiptDebugExport({
      trace,
      imageMeta: { width: 100, height: 200, sizeBytes: 4096 },
      ocrProvider: "openai",
      ocrModel: "gpt-4o-mini",
      ocrDurationMs: 2,
    });

    expect(exported.version.schemaVersion).toBe(DEBUG_SCHEMA_VERSION);
    expect(exported.version.buildVersion).toBeTruthy();
    expect(exported.image).toEqual({
      width: 100,
      height: 200,
      sizeBytes: 4096,
      orientation: "portrait",
    });
    expect(exported.ocr.provider).toBe("openai");
    expect(exported.ocr.rawText).toBe("LINE1\nLINE2");
    expect(exported.layout).toEqual(trace.stages.layout);
    expect(exported.graph).toEqual(trace.stages.receiptGraph);
    expect(exported.classification).toEqual(trace.stages.classifiedGraph);
    expect(exported.blocks).toEqual(trace.stages.blockDocument);
    expect(exported.purchase).toEqual(trace.stages.purchaseDraft);
    expect(exported.validation).toEqual(trace.stages.validationReport);
    expect(exported.timings.totalMs).toBe(36);
  });
});

describe("isDebugExportEnabled", () => {
  it("reflects NODE_ENV in test runtime", () => {
    expect(typeof isDebugExportEnabled()).toBe("boolean");
  });
});
