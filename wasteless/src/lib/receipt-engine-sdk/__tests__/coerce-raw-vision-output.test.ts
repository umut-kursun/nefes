import { describe, expect, it } from "vitest";
import { parseParsedReceiptJson } from "../types/ParsedReceipt";
import { coerceRawVisionOutput } from "../vision/coerceRawVisionOutput";

describe("coerceRawVisionOutput", () => {
  it("fills confidence, merchant shell, and metadata defaults", () => {
    const coerced = coerceRawVisionOutput({
      products: [{ name: "SU", lineTotal: 10 }],
      financials: { totalAmount: 10 },
    }) as Record<string, unknown>;

    expect(coerced.confidence).toBe(0.9);
    expect((coerced.merchant as { title: string }).title).toBeTruthy();
    expect((coerced.metadata as { purchaseDate: string }).purchaseDate).toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    );
  });

  it("parses minimal LLM JSON after coercion", () => {
    const parsed = parseParsedReceiptJson({
      merchant: { title: "Shell", category: "FUEL" },
      metadata: { purchaseDate: "2026-08-03" },
      products: [{ name: "MOTORIN", lineTotal: 1500 }],
      financials: { totalAmount: 1500 },
    });

    expect(parsed.confidence).toBe(0.9);
    expect(parsed.products).toHaveLength(1);
  });

  it("throws descriptive error when coercion is insufficient", () => {
    expect(() => parseParsedReceiptJson(null)).toThrow(
      /Vision JSON schema validation failed/
    );
  });
});
