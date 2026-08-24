import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runReceiptEngineV2 } from "../engine/runReceiptEngineV2";
import { parseVisionResult } from "../vision/parseVisionResult";

function loadOcrGolden(id: string) {
  const path = join(process.cwd(), `fixtures/vision/ocr-golden/${id}-ocr.json`);
  const data = JSON.parse(readFileSync(path, "utf8")) as {
    rawText: string;
    merchant: { title: string };
    metadata: Record<string, string>;
  };
  const lines = data.rawText.split(/\r?\n/).filter((l) => l.length > 0);
  return parseVisionResult({
    rawText: data.rawText,
    lines,
    merchant: { rawName: data.merchant.title },
    metadata: data.metadata as never,
  });
}

describe("cascade parser routing — ocr golden", () => {
  it("routes mcdonalds-1295 through fast_food parser with brand", () => {
    const result = runReceiptEngineV2(loadOcrGolden("mcdonalds-1295"));

    expect(result.parserId).toBe("fast_food-v1");
    expect(result.products).toHaveLength(5);
    expect(result.purchase.merchant.rawName).toBe("McDonald's");
    expect(result.purchase.footer.total).toBe(1295);
  });

  it("routes birinci-profiterol through restaurant parser", () => {
    const result = runReceiptEngineV2(loadOcrGolden("birinci-profiterol-625"));

    expect(result.parserId).toBe("restaurant-v1");
    expect(result.purchase.merchant.rawName).toContain("PROF");
    expect(result.purchase.footer.total).toBe(625);
  });

  it("routes migros-644 through supermarket parser", () => {
    const result = runReceiptEngineV2(loadOcrGolden("migros-644"));

    expect(result.parserId).toBe("supermarket-v1");
    expect(result.products.length).toBeGreaterThanOrEqual(13);
  });
});

describe("fuel parser — 3-kardes akaryakit", () => {
  it("parses fuel line and total", () => {
    const rawText = readFileSync(
      join(process.cwd(), "src/lib/receipt-engine/fixtures/ocr/3-kardes-akaryakit.txt"),
      "utf8"
    );
    const lines = rawText.split(/\r?\n/).filter((l) => l.length > 0);
    const vision = parseVisionResult({
      rawText,
      lines,
      merchant: { rawName: lines[0] ?? null },
    });
    const result = runReceiptEngineV2(vision);

    expect(result.parserId).toBe("fuel-v1");
    expect(result.products[0]?.rawName).toMatch(/MOTOR/i);
    expect(result.products[0]?.quantity).toBeCloseTo(35.85, 2);
    expect(result.purchase.footer.total).toBeCloseTo(2767.98, 2);
  });
});
