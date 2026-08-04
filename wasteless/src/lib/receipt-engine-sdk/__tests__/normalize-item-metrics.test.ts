import { describe, expect, it } from "vitest";
import { normalizeItemMetrics } from "../normalize/normalizeItemMetrics";

describe("normalizeItemMetrics", () => {
  it("normalizes 330ml volume to TL/L", () => {
    const m = normalizeItemMetrics({
      name: "Coca Cola 330ml",
      quantity: 1,
      lineTotal: 33,
    });
    expect(m.baseUnit).toBe("L");
    expect(m.normalizedUnitPrice).toBe(100);
    expect(m.variantSize).toBe("330ml");
    expect(m.productKey).toContain("330ml");
  });

  it("normalizes 500g pack weight to TL/kg", () => {
    const m = normalizeItemMetrics({
      name: "Apricot 500g",
      quantity: 1,
      lineTotal: 94.9,
    });
    expect(m.baseUnit).toBe("kg");
    expect(m.normalizedUnitPrice).toBe(189.8);
    expect(m.variantSize).toBe("500g");
  });

  it("normalizes multi-pack g items to TL/kg", () => {
    const m = normalizeItemMetrics({
      name: "SKRPR.KAYISI 500G",
      quantity: 5,
      lineTotal: 94.9,
    });
    expect(m.baseUnit).toBe("kg");
    expect(m.normalizedUnitPrice).toBe(37.96);
  });

  it("normalizes weighted produce kg lines", () => {
    const m = normalizeItemMetrics({
      name: "NEKTARİN",
      quantity: 0.744,
      lineTotal: 66.89,
    });
    expect(m.baseUnit).toBe("kg");
    expect(m.normalizedUnitPrice).toBe(89.91);
  });

  it("normalizes piece items to TL/ad", () => {
    const m = normalizeItemMetrics({
      name: "ALIŞVERİŞ POŞETİ",
      quantity: 12,
      lineTotal: 3,
    });
    expect(m.baseUnit).toBe("ad");
    expect(m.normalizedUnitPrice).toBe(0.25);
  });

  it("disambiguates Coca Cola 330ml vs 1.5L product keys", () => {
    const small = normalizeItemMetrics({
      name: "COLA TURKA 330ML",
      quantity: 1,
      lineTotal: 33,
    });
    const large = normalizeItemMetrics({
      name: "COLA TURKA 1,5 LT",
      quantity: 1,
      lineTotal: 55,
    });
    expect(small.productKey).not.toBe(large.productKey);
    expect(small.variantSize).toBe("330ml");
    expect(large.variantSize).toBe("1,5L");
  });

  it("cleans OCR noise from product names", () => {
    const m = normalizeItemMetrics({
      name: "DİŞFİRÇ EXTRCLEAN1+1 %10 *90,00",
      quantity: 2,
      lineTotal: 90,
    });
    expect(m.cleanedName).not.toMatch(/%10|\*90/);
  });

  it("normalizes COLA TÜRK OCR variants to COLA TURKA", () => {
    for (const raw of ["COLA TÜRKIYE 1,5 LT", "COLA TÜRK 330ML", "COLA TURK 1L"]) {
      const m = normalizeItemMetrics({ name: raw, quantity: 1, lineTotal: 55 });
      expect(m.cleanedName).toMatch(/COLA TURKA/i);
      expect(m.cleanedName).not.toMatch(/TÜRK(?:IYE|İYE)?\b/i);
    }
  });

  it("normalizes ULUDAĞ LİMONADA OCR variant", () => {
    const m = normalizeItemMetrics({
      name: "ULUDAĞ LİMONADA ŞEKSİZ 1L",
      quantity: 1,
      lineTotal: 45,
    });
    expect(m.cleanedName).toMatch(/Uludağ Limonata Şekersiz/i);
  });
});
