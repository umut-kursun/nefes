import { describe, expect, it } from "vitest";
import { sanitizeBrandOcr } from "@/lib/product-knowledge/productNormalizer";
import { normalizeProductName } from "@/lib/products";

describe("sanitizeBrandOcr", () => {
  it("repairs Cola Turka OCR variants", () => {
    expect(sanitizeBrandOcr("COLA TÜRKIYE")).toBe("Cola Turka");
    expect(sanitizeBrandOcr("COLA TÜRK")).toBe("Cola Turka");
    expect(sanitizeBrandOcr("cola turk")).toBe("Cola Turka");
  });

  it("repairs Uludağ Limonata Şekersiz OCR variants", () => {
    expect(sanitizeBrandOcr("ULUDAĞ LİMONADA ŞEKSİZ")).toBe(
      "Uludağ Limonata Şekersiz"
    );
    expect(sanitizeBrandOcr("uludag limonata seksiz")).toBe(
      "Uludağ Limonata Şekersiz"
    );
  });

  it("leaves unrelated names untouched", () => {
    expect(sanitizeBrandOcr("Ekmek 400 g")).toBe("Ekmek 400 g");
    expect(sanitizeBrandOcr("")).toBe("");
  });
});

describe("normalizeProductName integrates the sanitizer", () => {
  it("normalizes mangled brand OCR into the canonical display name", () => {
    expect(normalizeProductName("COLA TÜRKIYE")).toBe("Cola Turka");
    expect(normalizeProductName("ULUDAĞ LİMONADA ŞEKSİZ")).toBe(
      "Uludağ Limonata Şekersiz"
    );
  });
});
