import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  finalizeVisionParsedReceipt,
  parseParsedReceiptJson,
} from "../types/ParsedReceipt";
import { isStandaloneMultiplierProduct } from "../vision/mergeStandaloneMultiplierProducts";
import { validateReceiptTotal } from "@/lib/receipt-engine/layer-7-validate/validation/structural/receiptTotalValidator";
import { parsedReceiptToPurchaseDraft } from "../adapters/parsedReceiptToPurchaseDraft";
import { coerceVisionOcrExtract } from "../vision/visionOcrExtract";
import { visionOcrToParsedReceipt } from "../vision/visionOcrToParsedReceipt";

const migrosOcrRaw = {
  merchant: { title: "MİGROS TİCARET A.Ş.", category: "MARKET" },
  metadata: {
    purchaseDate: "2026-07-15",
    purchaseTime: "18:42:00",
    receiptNumber: "0042",
    currency: "TRY",
  },
  productLines: [
    { text: "ALGIDA FRIGOLA 60ML *1 *360,00", kind: "product" },
    { text: "9 AD x 40,00 TL/AD", kind: "quantity" },
    { text: "MARLBORO TBLUE PAKET *1 *460,00", kind: "product" },
    { text: "4 AD x 115,00 TL/AD", kind: "quantity" },
    { text: "% 25 % İNDİRİM %20 *-57,49", kind: "discount" },
    { text: "COLA TURKA 1,5 LT  %10.  *55,00", kind: "product" },
    { text: "MIGROS PLASTIK POSET *0,50", kind: "charge" },
  ],
  footerLines: ["TOPLAM  *817,51", "TOPKDV  *45,20"],
  paymentLines: ["Kredi Kartı *817,51"],
  rawText:
    "MİGROS TİCARET A.Ş.\nALGIDA FRIGOLA 60ML *1 *360,00\n9 AD x 40,00 TL/AD\nMARLBORO TBLUE PAKET *1 *460,00\n4 AD x 115,00 TL/AD\n% 25 % İNDİRİM %20 *-57,49\nCOLA TURKA 1,5 LT  %10.  *55,00\nMIGROS PLASTIK POSET *0,50\nTOPLAM  *817,51",
  confidence: 0.88,
};

/** Legacy string-only productLines (backward compat). */
const migrosOcrLegacyStrings = {
  ...migrosOcrRaw,
  productLines: migrosOcrRaw.productLines.map((line) => line.text),
};

describe("visionOcrToParsedReceipt", () => {
  it("does not emit multiplier lines as products", () => {
    const parsed = visionOcrToParsedReceipt(coerceVisionOcrExtract(migrosOcrRaw));
    expect(parsed.products.some((p) => /9 AD/i.test(p.name))).toBe(false);
    expect(parsed.products.some((p) => /4 AD/i.test(p.name))).toBe(false);
    expect(parsed.discounts).toHaveLength(1);
    expect(parsed.financials.totalAmount).toBeCloseTo(817.51, 2);
  });

  it("respects kind tags and infers from text for legacy string lines", () => {
    const parsed = visionOcrToParsedReceipt(
      coerceVisionOcrExtract(migrosOcrLegacyStrings)
    );
    expect(parsed.products.some((p) => /9 AD/i.test(p.name))).toBe(false);
    expect(parsed.discounts).toHaveLength(1);
    expect(parsed.products.some((p) => /POSET/i.test(p.name))).toBe(true);
  });

  it("parseParsedReceiptJson accepts OCR schema and normalizes via pipeline", async () => {
    const parsed = parseParsedReceiptJson(migrosOcrRaw);
    const finalized = finalizeVisionParsedReceipt(parsed);

    const algida = finalized.products.find((p) => /FRIGOLA/i.test(p.name))!;
    expect(algida.quantity).toBe(1);
    expect(algida.unitPrice).toBe(360);
    expect(algida.lineTotal).toBe(360);

    const marlboro = finalized.products.find((p) => /MARLBORO TBLUE/i.test(p.name))!;
    expect(marlboro.quantity).toBe(1);
    expect(marlboro.unitPrice).toBe(460);

    expect(
      finalized.products.filter((p) => isStandaloneMultiplierProduct(p))
    ).toHaveLength(0);

    const purchase = await parsedReceiptToPurchaseDraft(finalized);
    expect(validateReceiptTotal(purchase).issues.some((i) => i.code === "TOTAL_MISMATCH")).toBe(
      false
    );
    expect(finalized.mathConsistent).toBe(true);
  });

  it("legacy full ParsedReceipt fixtures still parse", () => {
    const legacy = JSON.parse(
      readFileSync(join(process.cwd(), "fixtures/vision/migros-multipliers.json"), "utf8")
    );
    const parsed = parseParsedReceiptJson(legacy);
    expect(parsed.products.length).toBeGreaterThan(0);
    expect(finalizeVisionParsedReceipt(parsed).financials.totalAmount).toBeCloseTo(
      817.51,
      2
    );
  });
});

describe("OCR schema size", () => {
  it("classified productLines output is smaller than legacy products[] shape", () => {
    const legacy = JSON.parse(
      readFileSync(join(process.cwd(), "fixtures/vision/migros-multipliers.json"), "utf8")
    );
    const ocr = migrosOcrRaw;
    expect(JSON.stringify(ocr).length).toBeLessThan(JSON.stringify(legacy).length * 0.85);
  });
});

describe("coerceVisionOcrExtract", () => {
  it("accepts plain string productLines for backward compatibility", () => {
    const extract = coerceVisionOcrExtract(migrosOcrLegacyStrings);
    expect(extract.productLines).toHaveLength(7);
    expect(extract.productLines[1]?.kind).toBe("product");
    expect(extract.productLines[1]?.text).toMatch(/9 AD/);
  });
});
