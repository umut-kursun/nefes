import { describe, expect, it } from "vitest";
import {
  REAL_RECEIPT_CATALOG,
  loadRealReceiptOcr,
  type RealReceiptRef,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { runReceiptPipelineV3 } from "@/lib/receipt-engine-v3";

function runV3(ref: RealReceiptRef) {
  const ocr = loadRealReceiptOcr(ref);
  return runReceiptPipelineV3(ocr.rawText, { debug: true });
}

function refByMerchant(merchant: RealReceiptRef["merchant"]): RealReceiptRef {
  const found = REAL_RECEIPT_CATALOG.find((r) => r.merchant === merchant);
  if (!found) throw new Error(`Missing fixture: ${merchant}`);
  return found;
}

describe("receipt-engine-v3 regression", () => {
  it("Shell fuel — quantity, unit, unit price, line total", () => {
    const { purchase, validation } = runV3(refByMerchant("shell-motorin"));
    expect(purchase.profile).toBe("fuel");
    expect(purchase.merchant).toMatch(/SHELL/i);
    const fuel = purchase.products[0];
    expect(fuel?.name).toMatch(/Motorin/i);
    expect(fuel?.quantity).toBeCloseTo(29.766, 2);
    expect(fuel?.unit).toBe("LT");
    expect(fuel?.unitPrice).toBeCloseTo(79.17, 2);
    expect(fuel?.lineTotal).toBeCloseTo(2356.1, 2);
    expect(purchase.total?.amount).toBeCloseTo(2356.1, 2);
    expect(validation.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("Opet fuel — fuel line parsed", () => {
    const { purchase } = runV3(refByMerchant("opet-benzin"));
    expect(purchase.profile).toBe("fuel");
    expect(purchase.merchant).toMatch(/OPET/i);
    const fuel = purchase.products[0];
    expect(fuel?.quantity).toBeCloseTo(42.15, 2);
    expect(fuel?.unit).toBe("LT");
    expect(fuel?.lineTotal).toBeCloseTo(1917.82, 2);
  });

  it("Migros — products, charge, payment, total; no footer leakage", () => {
    const { purchase, validation } = runV3(refByMerchant("migros-ortak-pos"));
    expect(purchase.profile).toBe("market");
    expect(purchase.merchant).toMatch(/MIGROS/i);
    expect(purchase.receiptNumber).toBe("123456");
    expect(purchase.products.map((p) => p.name)).toEqual([
      "EKMEK 750 GR",
      "SUT 1 LT",
    ]);
    expect(purchase.charges.some((c) => /po[sş]et/i.test(c.label))).toBe(true);
    expect(purchase.payments.some((p) => /ORTAK POS/i.test(p.label))).toBe(true);
    expect(purchase.total?.amount).toBeCloseTo(61.4, 2);
    expect(purchase.products.some((p) => /TOPLAM|ORTAK|TOPKDV/i.test(p.name))).toBe(
      false
    );
    expect(validation.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("Restaurant — products separate from payment", () => {
    const { purchase } = runV3(refByMerchant("lezzet-restaurant"));
    expect(purchase.merchant).toMatch(/LEZZET/i);
    expect(purchase.products.length).toBe(2);
    expect(purchase.payments.some((p) => /Nakit/i.test(p.label))).toBe(true);
    expect(purchase.products.some((p) => /TOPLAM|Nakit/i.test(p.name))).toBe(false);
  });

  it("Pharmacy — products and total", () => {
    const { purchase } = runV3(refByMerchant("eczane-pharmacy"));
    expect(purchase.products.length).toBe(2);
    expect(purchase.total?.amount).toBeCloseTo(205.5, 2);
  });

  it("OCR line swap — fuel amount before detail still parses", () => {
    const swapped = `SHELL & TURCAS PETROL A.S.
2356,10 TL
Motorin 29,766 LT 79,17 TL/L
TOPLAM 2356,10
Kredi Kart 2356,10`;
    const { purchase } = runReceiptPipelineV3(swapped);
    expect(purchase.products[0]?.lineTotal).toBeCloseTo(2356.1, 2);
    expect(purchase.products[0]?.quantity).toBeCloseTo(29.766, 2);
  });

  it("never classifies TOPKDV or address as product", () => {
    const text = `MIGROS TICARET A.S.
Atatürk Mah. Cad. No:1 Istanbul
TOPKDV 0,55
TOPLAM 10,00`;
    const { purchase } = runReceiptPipelineV3(text);
    expect(purchase.products).toHaveLength(0);
    expect(purchase.vatSummary.length + purchase.total ? 1 : 0).toBeGreaterThan(0);
  });
});
