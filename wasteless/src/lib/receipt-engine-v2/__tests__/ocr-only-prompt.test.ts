import { describe, expect, it } from "vitest";
import {
  OCR_ONLY_VISION_PROMPT,
  VISION_RESULT_JSON_SCHEMA,
} from "../vision/ocrOnlyPrompt";

describe("OCR-only vision prompt", () => {
  it("schema includes only OCR and metadata fields", () => {
    expect(VISION_RESULT_JSON_SCHEMA).toContain("rawName");
    expect(VISION_RESULT_JSON_SCHEMA).toContain("rawText");
    expect(VISION_RESULT_JSON_SCHEMA).toContain("lines");
    expect(VISION_RESULT_JSON_SCHEMA).not.toContain("products");
    expect(VISION_RESULT_JSON_SCHEMA).not.toContain("financials");
    expect(VISION_RESULT_JSON_SCHEMA).not.toContain("discounts");
  });

  it("prompt forbids purchase parsing in schema and routing rules", () => {
    expect(VISION_RESULT_JSON_SCHEMA).not.toContain("products");
    expect(VISION_RESULT_JSON_SCHEMA).not.toContain("financials");
    expect(VISION_RESULT_JSON_SCHEMA).not.toContain("discounts");
    expect(OCR_ONLY_VISION_PROMPT).toContain("FORBIDDEN");
    expect(OCR_ONLY_VISION_PROMPT).not.toContain("products[]");
    expect(OCR_ONLY_VISION_PROMPT).not.toContain("ARRAY ROUTING");
  });
});
