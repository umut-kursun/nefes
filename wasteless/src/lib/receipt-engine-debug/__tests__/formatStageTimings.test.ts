import { describe, expect, it } from "vitest";
import { formatStageTimingsSection } from "@/lib/receipt-engine-debug/formatStageTimings";

describe("formatStageTimingsSection", () => {
  it("formats human-readable lines with seconds for long phases", () => {
    const section = formatStageTimingsSection({
      preprocessMs: 842,
      openAiRequestMs: 10200,
      normalizeVisionReceiptMs: 12,
      extractionMs: 12,
      totalMs: 11513,
    });

    expect(section).toContain("===== STAGE TIMINGS =====");
    expect(section).toContain("Image preprocessing (client): 842 ms");
    expect(section).toContain("OCR (Vision API): 10200 ms (10.2 s)");
    expect(section).toContain("Semantic extraction (server): 12 ms");
    expect(section).toContain('"openAiRequestMs": 10200');
  });
});
