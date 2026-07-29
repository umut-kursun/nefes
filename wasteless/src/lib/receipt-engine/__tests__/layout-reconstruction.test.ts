import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import type { LayoutDocument } from "@/lib/receipt-engine/types/models/layout";
import { reconstructLayout } from "@/lib/receipt-engine/layer-2-layout/layoutReconstructor";
import { ocrDocumentFromRaw } from "@/lib/receipt-engine/fixtures/ocrFromRaw";

const FIXTURE_DIR = path.join(
  __dirname,
  "../fixtures/tr-supermarket"
);

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, `${name}.txt`), "utf8");
}

function layoutFor(name: string, profileId = "generic-tr"): LayoutDocument {
  return reconstructLayout(ocrDocumentFromRaw(loadFixture(name)), profileId);
}

/** Stable comparison — ignores floating confidence rounding drift. */
function expectLayout(actual: LayoutDocument, expected: LayoutDocument): void {
  expect(actual.profileId).toBe(expected.profileId);
  expect(actual.readingOrder).toEqual(expected.readingOrder);
  expect(actual.regions).toEqual(expected.regions);
  expect(actual.lines.length).toBe(expected.lines.length);

  for (let i = 0; i < expected.lines.length; i++) {
    const a = actual.lines[i]!;
    const e = expected.lines[i]!;
    expect(a.index).toBe(e.index);
    expect(a.text).toBe(e.text);
    expect(a.rawText).toBe(e.rawText);
    expect(a.region).toBe(e.region);
    expect(a.trailingAmount).toBe(e.trailingAmount);
    expect(a.columns).toEqual(e.columns);
    expect(a.features).toEqual(e.features);
    expect(a.tokens).toEqual(e.tokens);
    expect(a.confidence).toBeCloseTo(e.confidence, 2);
  }

  expect(actual.confidence).toBeCloseTo(expected.confidence, 2);
}

describe("Layer 2 — layout reconstruction", () => {
  it("reconstructs tr-supermarket with-bag fixture", () => {
    const layout = layoutFor("with-bag");
    expectLayout(layout, {
      profileId: "generic-tr",
      readingOrder: [0, 1, 2, 3, 4, 5],
      regions: { header: [0, 1], body: [2, 3, 4], footer: [5] },
      confidence: 0.7833,
      lines: [
        {
          index: 0,
          text: "MIGROS A.S.",
          rawText: "MIGROS A.S.",
          region: "header",
          columns: { name: "MIGROS A.S." },
          trailingAmount: null,
          features: {
            hasVatToken: false,
            hasWeightPattern: false,
            hasQuantityToken: false,
            isAmountOnly: false,
            isLikelyContinuation: false,
            isRightAlignedPrice: false,
          },
          tokens: {},
          confidence: 0.65,
        },
        {
          index: 1,
          text: "ISTANBUL",
          rawText: "ISTANBUL",
          region: "header",
          columns: { name: "ISTANBUL" },
          trailingAmount: null,
          features: {
            hasVatToken: false,
            hasWeightPattern: false,
            hasQuantityToken: false,
            isAmountOnly: false,
            isLikelyContinuation: false,
            isRightAlignedPrice: false,
          },
          tokens: {},
          confidence: 0.65,
        },
        {
          index: 2,
          text: "Sut 1 L %1 45,90",
          rawText: "Sut 1 L %1 45,90",
          region: "body",
          columns: { name: "Sut 1 L", vat: "%1", amount: "45,90" },
          trailingAmount: 45.9,
          features: {
            hasVatToken: true,
            hasWeightPattern: false,
            hasQuantityToken: true,
            isAmountOnly: false,
            isLikelyContinuation: false,
            isRightAlignedPrice: false,
          },
          tokens: { quantity: "1 L", vat: "%1" },
          confidence: 0.85,
        },
        {
          index: 3,
          text: "Ekmek %1 15,00",
          rawText: "Ekmek %1 15,00",
          region: "body",
          columns: { name: "Ekmek", vat: "%1", amount: "15,00" },
          trailingAmount: 15,
          features: {
            hasVatToken: true,
            hasWeightPattern: false,
            hasQuantityToken: false,
            isAmountOnly: false,
            isLikelyContinuation: false,
            isRightAlignedPrice: false,
          },
          tokens: { vat: "%1" },
          confidence: 0.85,
        },
        {
          index: 4,
          text: "Alisveris Poseti 0,50",
          rawText: "Alisveris Poseti 0,50",
          region: "body",
          columns: { name: "Alisveris Poseti", amount: "0,50" },
          trailingAmount: 0.5,
          features: {
            hasVatToken: false,
            hasWeightPattern: false,
            hasQuantityToken: false,
            isAmountOnly: false,
            isLikelyContinuation: false,
            isRightAlignedPrice: false,
          },
          tokens: {},
          confidence: 0.85,
        },
        {
          index: 5,
          text: "TOPLAM 61,40",
          rawText: "TOPLAM 61,40",
          region: "footer",
          columns: { name: "TOPLAM", amount: "61,40" },
          trailingAmount: 61.4,
          features: {
            hasVatToken: false,
            hasWeightPattern: false,
            hasQuantityToken: false,
            isAmountOnly: false,
            isLikelyContinuation: false,
            isRightAlignedPrice: false,
          },
          tokens: {},
          confidence: 0.85,
        },
      ],
    });
  });

  it("reconstructs tr-supermarket products-only fixture", () => {
    const layout = layoutFor("products-only");
    expect(layout.lines).toHaveLength(4);
    expect(layout.regions.footer).toEqual([3]);
    expect(layout.lines[1]?.features.hasQuantityToken).toBe(true);
    expect(layout.lines[1]?.columns).toMatchObject({
      name: "Peynir 500g",
      vat: "%1",
      amount: "89,90",
    });
  });

  it("detects weighted continuation and amount-only price line", () => {
    const layout = layoutFor("weighted-continuation");
    expect(layout.lines[2]?.text).toBe("Domates");
    expect(layout.lines[2]?.features.isLikelyContinuation).toBe(true);
    expect(layout.lines[3]?.features.isAmountOnly).toBe(true);
    expect(layout.lines[3]?.features.isRightAlignedPrice).toBe(true);
    expect(layout.lines[3]?.trailingAmount).toBe(66.89);
  });

  it("assigns footer region for payment and total lines", () => {
    const layout = layoutFor("footer-payments");
    const footerLines = layout.lines.filter((l) => l.region === "footer");
    expect(footerLines.map((l) => l.text)).toEqual([
      "Nakit 50,00",
      "Kredi Kart 8,90",
      "TOPLAM 8,90",
    ]);
  });

  it("layer2Layout produces no LAYER_NOT_IMPLEMENTED issue", async () => {
    const { layer2Layout } = await import("@/lib/receipt-engine");
    const ocr = ocrDocumentFromRaw(loadFixture("with-bag"));
    const { createEngineDependencies, resolveEngineConfig } = await import(
      "@/lib/receipt-engine"
    );
    const ctx = {
      deps: createEngineDependencies({
        config: resolveEngineConfig({}),
      }),
      config: resolveEngineConfig({}),
    };
    const result = await layer2Layout.run(ocr, ctx);
    expect(result.issues).toEqual([]);
    expect(result.output.lines.length).toBeGreaterThan(0);
  });
});

describe("Layer 2 — module constraints", () => {
  it("does not import v1 parser modules", async () => {
    const files = [
      "layoutReconstructor.ts",
      "columnDetector.ts",
      "continuationDetector.ts",
      "footerDetector.ts",
      "readingOrderResolver.ts",
      "featureExtractor.ts",
      "patterns.ts",
      "lineUtils.ts",
    ];
    const forbidden = [
      "receipt-intelligence",
      "receipt-line-parser",
      "receipt-charges",
      "receipt-pipeline",
    ];
    for (const file of files) {
      const src = fs.readFileSync(
        path.join(__dirname, "../layer-2-layout", file),
        "utf8"
      );
      for (const f of forbidden) {
        expect(src).not.toContain(f);
      }
    }
  });
});
