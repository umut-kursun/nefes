import { describe, expect, it } from "vitest";
import {
  segmentDocument,
  nextSectionState,
  looksLikeProductStart,
} from "@/lib/receipt-engine/document-segmentation";
import {
  extractPurchasedQuantity,
  extractPackageAttribute,
} from "@/lib/receipt-engine/layer-6-purchase/parsers/purchasedQuantity";
import { scoreMerchantLine } from "@/lib/receipt-engine/merchant/merchantScorer";
import { extractFuelFromProductLines } from "@/lib/receipt-engine/layer-6-purchase/fuelMapper";
import { ocrDocumentFromRaw } from "@/lib/receipt-engine/fixtures/ocrFromRaw";
import { reconstructLayout } from "@/lib/receipt-engine/layer-2-layout/layoutReconstructor";
import { buildReceiptGraph } from "@/lib/receipt-engine/layer-3-graph/buildReceiptGraph";
import { buildClassifiedGraph } from "@/lib/receipt-engine/layer-4-classify/buildClassifiedGraph";
import { buildBlockDocument } from "@/lib/receipt-engine/layer-5-blocks/buildBlockDocument";
import { buildPurchaseDraft } from "@/lib/receipt-engine/layer-6-purchase/buildPurchaseDraft";

describe("document segmentation state machine", () => {
  it("never returns to PRODUCTS after TOTALS", () => {
    let state = nextSectionState("PRODUCTS", "Sut 1 L 45,90");
    expect(state).toBe("PRODUCTS");
    state = nextSectionState(state, "TOPLAM 100,00");
    expect(state).toBe("TOTALS");
    state = nextSectionState(state, "Mystery Item 10,00");
    expect(state).toBe("TOTALS");
    state = nextSectionState(state, "NAKIT 100,00");
    expect(state).toBe("PAYMENTS");
    state = nextSectionState(state, "AID A000000");
    expect(state).toBe("CARD_SLIP");
  });

  it("segments a supermarket receipt into HEADER/PRODUCTS/TOTALS/PAYMENTS", () => {
    const lines = [
      "MIGROS A.S.",
      "ISTANBUL",
      "Sut 1 L %1 45,90",
      "Ekmek %1 15,00",
      "TOPLAM 61,40",
      "KREDI KARTI 61,40",
      "TESEKKURLER",
    ];
    const seg = segmentDocument(lines);
    expect(seg.lines[0]?.section).toBe("HEADER");
    expect(seg.lines[2]?.section).toBe("PRODUCTS");
    expect(seg.lines[3]?.section).toBe("PRODUCTS");
    expect(seg.lines[4]?.section).toBe("TOTALS");
    expect(seg.lines[5]?.section).toBe("PAYMENTS");
    expect(seg.lines[2]?.region).toBe("body");
    expect(seg.lines[4]?.region).toBe("footer");
    expect(seg.productsEndIndex).toBe(4);
  });

  it("keeps card-slip lines out of PRODUCTS", () => {
    const lines = [
      "SHELL",
      "Motorin 29,766 LT x 79,17 2356,10",
      "TOPLAM 2356,10",
      "KREDI KARTI 2356,10",
      "AID A0000000031010",
      "TERM 123456",
      "ONAY 998877",
      "PAYWAVE",
    ];
    const seg = segmentDocument(lines);
    const productTexts = seg.lines
      .filter((l) => l.section === "PRODUCTS")
      .map((l) => l.text);
    expect(productTexts.some((t) => /AID|TERM|ONAY|PAYWAVE/i.test(t))).toBe(
      false
    );
    expect(seg.lines.some((l) => l.section === "CARD_SLIP")).toBe(true);
  });

  it("detects product start lines", () => {
    expect(looksLikeProductStart("Sut 1 L 45,90")).toBe(true);
    expect(looksLikeProductStart("TOPLAM 45,90")).toBe(false);
  });
});

describe("purchased quantity vs package attribute", () => {
  it("does not treat 150 GR / 330 ML / 1 L as purchased quantity", () => {
    expect(extractPurchasedQuantity("PEPSI 330 ML").kind).toBe("none");
    expect(extractPurchasedQuantity("Sut 1 L").kind).toBe("none");
    expect(extractPackageAttribute("PEPSI 330 ML")?.unit).toMatch(/ml/i);
  });

  it("extracts explicit adet and xN", () => {
    expect(extractPurchasedQuantity("Ekmek 2 ADET").value).toBe(2);
    expect(extractPurchasedQuantity("x 3 SOMUN").value).toBe(3);
  });

  it("extracts sold-by-weight / fuel dispensed qty", () => {
    const q = extractPurchasedQuantity("0,744 kg x 89,90");
    expect(q.kind).toBe("sold_weight");
    expect(q.value).toBeCloseTo(0.744, 3);
  });
});

describe("merchant scoring", () => {
  it("scores company names high and greetings low", () => {
    expect(scoreMerchantLine("MIGROS A.S.", 0).score).toBeGreaterThan(0.7);
    expect(scoreMerchantLine("HOS GELDINIZ", 0).score).toBeLessThan(0.1);
    expect(scoreMerchantLine("www.migros.com.tr", 0).score).toBe(0);
  });
});

describe("parser architecture regression — no footer/payment as products", () => {
  function purchaseFromRaw(raw: string) {
    const ocr = ocrDocumentFromRaw(raw);
    const layout = reconstructLayout(ocr, "generic-tr");
    const graph = buildReceiptGraph(layout);
    const classified = buildClassifiedGraph(graph);
    const blocks = buildBlockDocument(classified);
    return buildPurchaseDraft(blocks);
  }

  it("does not turn TOPLAM / NAKIT / AID into products", () => {
    const draft = purchaseFromRaw(
      [
        "MIGROS A.S.",
        "Sut 1 L %1 45,90",
        "TOPLAM 45,90",
        "NAKIT 45,90",
        "AID A000000",
        "TERM 12",
        "ONAY 99",
        "MERSIS 0123",
      ].join("\n")
    );

    const names = draft.products.map((p) => p.name.toLocaleLowerCase("tr-TR"));
    expect(names.some((n) => n.includes("toplam"))).toBe(false);
    expect(names.some((n) => n.includes("nakit"))).toBe(false);
    expect(names.some((n) => n.includes("aid"))).toBe(false);
    expect(names.some((n) => n.includes("term"))).toBe(false);
    expect(names.some((n) => n.includes("mersis"))).toBe(false);
    expect(draft.products.length).toBeGreaterThanOrEqual(1);
    expect(draft.total?.amount).toBeCloseTo(45.9, 1);
  });

  it("does not set purchased quantity from package size on Sut 1 L", () => {
    const draft = purchaseFromRaw("MIGROS A.S.\nSut 1 L %1 45,90\nTOPLAM 45,90");
    const sut = draft.products.find((p) => /sut/i.test(p.name));
    expect(sut).toBeTruthy();
    // Package "1 L" is an attribute — not purchased quantity.
    expect(sut?.quantity).toBeUndefined();
  });

  it("maps fuel dispensed liters as sold quantity, not package size", () => {
    const draft = purchaseFromRaw(
      [
        "SHELL PETROL A.S.",
        "34 ABC 123",
        "Motorin 29,766 LT x 79,17 2356,10",
        "TOPLAM 2356,10",
        "KREDI KARTI 2356,10",
        "AID A0000000031010",
        "TERM 123456",
        "ONAY 998877",
      ].join("\n")
    );
    expect(draft.products.some((p) => /aid|term|onay/i.test(p.name))).toBe(
      false
    );
    const fuel = draft.products.find((p) => /motorin/i.test(p.name));
    expect(fuel?.quantity).toBeCloseTo(29.766, 3);
    expect(fuel?.unit).toMatch(/l/i);
    expect(fuel?.unitPrice).toBeCloseTo(79.17, 2);
    expect(fuel?.lineTotal).toBeCloseTo(2356.1, 1);
    expect(draft.total?.amount).toBeCloseTo(2356.1, 1);
    expect(draft.payments.length).toBeGreaterThanOrEqual(1);

    const details = extractFuelFromProductLines(
      draft.products,
      draft.provenance.rawTexts
    );
    expect(details?.liters).toBeCloseTo(29.766, 3);
    expect(details?.pricePerLiter).toBeCloseTo(79.17, 2);
    expect(details?.fuelType?.toLowerCase()).toContain("motorin");
    expect(details?.plate).toMatch(/34/);
  });

  it("keeps mixed payments out of the product list", () => {
    const draft = purchaseFromRaw(
      [
        "A101",
        "Ekmek %1 15,00",
        "TOPLAM 50,00",
        "NAKIT 20,00",
        "KREDI KARTI 30,00",
        "PARA USTU 0,00",
      ].join("\n")
    );
    const names = draft.products.map((p) => p.name.toLocaleLowerCase("tr-TR"));
    expect(names.some((n) => /nakit|kredi|para/.test(n))).toBe(false);
    expect(draft.products).toHaveLength(1);
    expect(draft.payments.length).toBeGreaterThanOrEqual(2);
  });
});
