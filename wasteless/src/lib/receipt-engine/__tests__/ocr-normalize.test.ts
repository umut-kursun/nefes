import { describe, expect, it } from "vitest";
import {
  normalizeLineEndings,
  normalizeCurrencySymbols,
  collapseInlineSpaces,
  normalizeOcrRawPayload,
  normalizeUnicode,
} from "@/lib/receipt-engine/layer-1-ocr/normalizeOcrDocument";

describe("OCR normalization", () => {
  it("normalizes line endings", () => {
    expect(normalizeLineEndings("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("normalizes unicode and strips currency symbols", () => {
    const text = "Poseti ₺0,50 \u00a0";
    expect(
      collapseInlineSpaces(normalizeCurrencySymbols(normalizeUnicode(text)))
    ).toBe("Poseti 0,50");
  });

  it("collapses inline spaces per line", () => {
    expect(collapseInlineSpaces("Sut  1 L\nEkmek")).toBe("Sut 1 L\nEkmek");
  });

  it("recovers malformed OCR to clean lines", () => {
    const raw = "MIGROS A.S.\rISTANBUL\r\nSut  1 L %1 45,90";
    const doc = normalizeOcrRawPayload({ rawText: raw, source: "mock" });
    expect(doc.lines).toContain("Sut 1 L %1 45,90");
    expect(doc.rawText).not.toContain("\r");
  });

  it("computes quality from line confidences", () => {
    const doc = normalizeOcrRawPayload({
      rawText: "a\nb",
      source: "mock",
      lines: [
        { text: "a", confidence: 0.4 },
        { text: "b", confidence: 0.6 },
      ],
    });
    expect(doc.quality.score).toBeCloseTo(0.5, 2);
    expect(doc.lineDetails?.[0]?.confidence).toBe(0.4);
  });

  it("preserves optional bounding boxes", () => {
    const doc = normalizeOcrRawPayload({
      rawText: "line",
      source: "vision_primary",
      lines: [{ text: "line", confidence: 0.9, bbox: { x: 1, y: 2, width: 3, height: 4 } }],
    });
    expect(doc.lineDetails?.[0]?.bbox).toEqual({
      x: 1,
      y: 2,
      width: 3,
      height: 4,
    });
  });
});
