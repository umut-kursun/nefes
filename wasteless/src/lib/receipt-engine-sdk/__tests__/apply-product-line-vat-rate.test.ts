import { describe, expect, it } from "vitest";
import { applyProductLineVatRate } from "../vision/applyProductLineVatRate";
import {
  finalizeParsedReceipt,
  finalizeVisionParsedReceipt,
  parseParsedReceiptJson,
  type ParsedReceipt,
} from "../types/ParsedReceipt";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsedReceiptToPurchaseDraft } from "../adapters/parsedReceiptToPurchaseDraft";

describe("applyProductLineVatRate", () => {
  it("maps TATLI %10 to vatRate 10 and quantity 1 (Birinci Profiterol)", () => {
    const fixed = applyProductLineVatRate({
      name: "TATLI %10",
      quantity: 10,
      unit: "ad",
      unitPrice: 625,
      lineTotal: 625,
    });
    expect(fixed.name).toBe("TATLI");
    expect(fixed.quantity).toBe(1);
    expect(fixed.vatRatePercentage).toBe(10);
    expect(fixed.unitPrice).toBe(625);
  });

  it("does not treat bulk qty as VAT when line math uses real multiplier", () => {
    const fixed = applyProductLineVatRate({
      name: "COLA TURKA 1,5 LT",
      quantity: 10,
      unit: "ad",
      unitPrice: 6.5,
      lineTotal: 55,
      vatRatePercentage: 10,
    });
    expect(fixed.quantity).toBe(10);
    expect(fixed.vatRatePercentage).toBe(10);
  });

  it("defaults quantity to 1 when missing and no multiplier", () => {
    const fixed = applyProductLineVatRate({
      name: "TATLI %10",
      lineTotal: 625,
      unitPrice: 625,
    });
    expect(fixed.quantity).toBe(1);
    expect(fixed.vatRatePercentage).toBe(10);
  });

  it("maps %1 on supermarket lines to vatRate without changing kg quantity", () => {
    const fixed = applyProductLineVatRate({
      name: "NEKTARIN %1",
      quantity: 0.744,
      unit: "kg",
      unitPrice: 89.9,
      lineTotal: 66.89,
    });
    expect(fixed.name).toBe("NEKTARIN");
    expect(fixed.quantity).toBe(0.744);
    expect(fixed.vatRatePercentage).toBe(1);
  });
});

describe("Birinci Profiterol fixture", () => {
  const fixturePath = join(
    process.cwd(),
    "fixtures/vision/birinci-profiterol-pos.json"
  );

  it("parses TATLI with quantity 1 and vatRate 10 after vision finalize", async () => {
    const raw = parseParsedReceiptJson(
      JSON.parse(readFileSync(fixturePath, "utf8"))
    );
    const misread: ParsedReceipt = {
      ...raw,
      products: [
        {
          name: "TATLI %10",
          quantity: 10,
          unit: "ad",
          unitPrice: 625,
          lineTotal: 625,
        },
      ],
      payments: [{ type: "CREDIT_CARD", amount: 56.82 }],
      financials: { vatTotal: 56.82, totalAmount: 56.82 },
    };

    const finalized = finalizeVisionParsedReceipt(misread);
    const tatli = finalized.products[0]!;

    expect(tatli.name).toBe("TATLI");
    expect(tatli.quantity).toBe(1);
    expect(tatli.vatRatePercentage).toBe(10);
    expect(finalized.financials.totalAmount).toBe(625);
    expect(finalized.payments[0]!.amount).toBe(625);

    const draft = await parsedReceiptToPurchaseDraft(finalized);
    expect(draft.products[0]?.quantity).toBe(1);
    expect(draft.products[0]?.vatRate).toBe(10);
  });

  it("OCR fallback path also separates VAT from quantity", () => {
    const raw: ParsedReceipt = {
      merchant: { title: "BİRİNCİ PROFİTEROL", category: "RESTAURANT" },
      metadata: { purchaseDate: "2026-07-30", currency: "TRY" },
      products: [
        {
          name: "TATLI %10",
          quantity: 10,
          unit: "ad",
          unitPrice: 625,
          lineTotal: 625,
        },
      ],
      discounts: [],
      payments: [{ type: "CREDIT_CARD", amount: 56.82 }],
      financials: { vatTotal: null, totalAmount: 56.82 },
      rawText:
        "TATLI %10 *625,00\nTOPKDV *56,82\nTOPLAM *625,00\nKredi Kartı *625,00",
    };

    const finalized = finalizeParsedReceipt(raw);
    expect(finalized.products[0]!.quantity).toBe(1);
    expect(finalized.products[0]!.vatRatePercentage).toBe(10);
    expect(finalized.financials.totalAmount).toBe(625);
  });
});
