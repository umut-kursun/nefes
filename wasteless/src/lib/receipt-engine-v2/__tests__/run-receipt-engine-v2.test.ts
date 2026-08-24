import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPurchase } from "../engine/buildPurchase";
import { runReceiptEngineV2 } from "../engine/runReceiptEngineV2";
import { parseVisionResult } from "../vision/parseVisionResult";
import type { VisionResult } from "../vision/types";

function loadOcrLines(relativePath: string): string[] {
  const text = readFileSync(join(process.cwd(), relativePath), "utf8");
  return text.split(/\r?\n/).filter((line) => line.length > 0);
}

function visionFromOcrLines(
  lines: readonly string[],
  extras: Partial<VisionResult> = {}
): VisionResult {
  return parseVisionResult({
    rawText: lines.join("\n"),
    lines: [...lines],
    ...extras,
  });
}

function visionFromFixture(relativePath: string): VisionResult {
  const lines = loadOcrLines(relativePath);
  return visionFromOcrLines(lines, {
    merchant: { rawName: lines[0] ?? null },
  });
}

describe("buildPurchase", () => {
  it("assembles merchant, metadata, products, and footer without transformation", () => {
    const vision = parseVisionResult({
      merchant: {
        rawName: "MIGROS TÜRK",
        rawAddress: "İSTANBUL",
        rawTaxNumber: "1234567890",
      },
      metadata: {
        receiptNumber: "0042",
        purchaseDate: "2026-08-05",
        purchaseTime: "14:30:00",
        currency: "TRY",
      },
      rawText: "MIGROS TÜRK\nTOPLAM 120,00",
      lines: ["MIGROS TÜRK", "TOPLAM 120,00"],
    });

    const footer = {
      subtotal: null,
      total: 120,
      vatTotal: null,
      payments: [],
    };

    const products = [
      {
        rawName: "EKMEK",
        quantity: 1,
        unit: "ad",
        unitPrice: 15,
        lineTotal: 15,
        vatRate: 1,
        discounts: [],
      },
    ];

    expect(buildPurchase(vision, products, footer)).toEqual({
      merchant: {
        rawName: "MIGROS TÜRK",
        rawAddress: "İSTANBUL",
        rawTaxNumber: "1234567890",
      },
      metadata: {
        purchaseDate: "2026-08-05",
        purchaseTime: "14:30:00",
        receiptNumber: "0042",
        currency: "TRY",
      },
      products,
      charges: [],
      footer,
      fuel: null,
    });
  });

  it("fills missing vision fields with null", () => {
    const vision = parseVisionResult({
      rawText: "TOPLAM 10,00",
      lines: ["TOPLAM 10,00"],
    });

    const purchase = buildPurchase(vision, [], {
      subtotal: null,
      total: 10,
      vatTotal: null,
      payments: [],
    });

    expect(purchase.merchant).toEqual({
      rawName: null,
      rawAddress: null,
      rawTaxNumber: null,
    });
    expect(purchase.metadata).toEqual({
      purchaseDate: null,
      purchaseTime: null,
      receiptNumber: null,
      currency: null,
    });
  });
});

describe("runReceiptEngineV2 integration", () => {
  it("exposes every pipeline stage for Migros receipt", () => {
    const vision = visionFromFixture(
      "src/lib/receipt-engine/fixtures/corpus/migros-ortak-pos/ocr.txt"
    );
    const result = runReceiptEngineV2(vision);

    expect(result.rawVision.lines).toHaveLength(9);
    expect(result.tokens).toHaveLength(9);
    expect(result.blocks).toHaveLength(2);
    expect(result.purchase.products).toHaveLength(2);
    expect(result.footer.total).toBe(61.4);
    expect(result.footer.vatTotal).toBe(0.55);
    expect(result.purchase.footer).toBe(result.footer);
    expect(result.purchase.merchant.rawName).toBe("MIGROS TICARET A.S.");
    expect(result.purchase.products[0]?.rawName).toBe("EKMEK 750 GR");
    expect(result.purchase.products[1]?.rawName).toContain("SUT");
  });

  it("exposes every pipeline stage for restaurant receipt", () => {
    const vision = visionFromFixture(
      "src/lib/receipt-engine/fixtures/corpus/lezzet-restaurant/ocr.txt"
    );
    const result = runReceiptEngineV2(vision);

    expect(result.rawVision.lines).toHaveLength(6);
    expect(result.tokens).toHaveLength(6);
    expect(result.blocks).toHaveLength(2);
    expect(result.purchase.products).toHaveLength(2);
    expect(result.footer.total).toBe(405);
    expect(result.footer.payments).toHaveLength(1);
    expect(result.footer.payments[0]).toMatchObject({
      type: "cash",
      amount: 405,
    });
    expect(result.purchase.products[0]?.rawName).toBe("Corba");
    expect(result.purchase.products[1]?.rawName).toBe("Izgara");
  });

  it("exposes every pipeline stage for fuel receipt", () => {
    const vision = visionFromFixture(
      "src/lib/receipt-engine/fixtures/corpus/opet-benzin/ocr.txt"
    );
    const result = runReceiptEngineV2(vision);

    expect(result.rawVision.lines).toHaveLength(6);
    expect(result.tokens).toHaveLength(6);
    expect(result.blocks).toHaveLength(1);
    expect(result.purchase.products).toHaveLength(1);
    expect(result.footer.total).toBe(1917.82);
    expect(result.footer.payments).toHaveLength(1);
    expect(result.purchase.products[0]?.rawName).toContain("Benzin");
  });

  it("exposes every pipeline stage for single-line product receipt", () => {
    const lines = ["BAKKAL", "CAY %1 25,00", "TOPLAM 25,00"];
    const vision = visionFromOcrLines(lines, {
      merchant: { rawName: "BAKKAL" },
    });
    const result = runReceiptEngineV2(vision);

    expect(result.rawVision.lines).toHaveLength(3);
    expect(result.tokens).toHaveLength(3);
    expect(result.blocks).toHaveLength(1);
    expect(result.purchase.products).toHaveLength(1);
    expect(result.footer.total).toBe(25);
    expect(result.purchase.products[0]).toMatchObject({
      rawName: "CAY",
      lineTotal: 25,
      quantity: 1,
    });
    expect(result.purchase.merchant.rawName).toBe("BAKKAL");
  });

  it("returns the same footer reference on purchase and result root", () => {
    const vision = visionFromOcrLines(["TOPLAM 10,00"], {
      merchant: { rawName: "TEST" },
    });
    const result = runReceiptEngineV2(vision);

    expect(result.purchase.footer).toBe(result.footer);
    expect(result.purchase.products).toBe(result.purchase.products);
    expect(result.rawVision).toBe(vision);
  });
});
