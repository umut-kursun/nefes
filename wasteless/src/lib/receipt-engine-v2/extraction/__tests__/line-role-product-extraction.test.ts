import { describe, expect, it } from "vitest";
import { assignLineRoles } from "../assignLineRoles";
import { LineRole } from "../LineRole";
import { extractProductsBeforeFooter } from "../productPass";
import { extractFooterFirst } from "../footerFirstPass";
import { extractReceiptDocument } from "../extractReceiptDocument";
import { isPollutedProductName } from "@/lib/receipt-accuracy-contract/patterns";

function rolesFor(lines: readonly string[]) {
  const footer = extractFooterFirst(lines);
  return assignLineRoles(lines, footer.footerStartIndex);
}

function productsFrom(lines: readonly string[]) {
  const footer = extractFooterFirst(lines);
  const roles = assignLineRoles(lines, footer.footerStartIndex);
  return extractProductsBeforeFooter(lines, footer.footerStartIndex, roles).products;
}

describe("assignLineRoles", () => {
  it("marks RAMZOR-style header and footer lines as non-product", () => {
    const lines = [
      "RAMZOR GIDA TURİZM LTD. ŞTİ.",
      "ŞANCAKLI MAH. MEVKİİ NO:12",
      "TEL: 0212 555 0101",
      "BÜYÜK MÜKELLEFLER V.D. 1234567890",
      "Akali Burger 160 Gr %10 *185,00",
      "Patates Kızartması %10 *95,00",
      "YİYECEK %10 *1.480,00",
      "TOPKDV",
      "*134,55",
      "TOPLAM",
      "*1.480,00",
      "KREDİ KARTI",
      "*1.480,00",
    ];
    const roles = rolesFor(lines);
    expect(roles[0]?.role).toMatch(/merchant_header|metadata/);
    expect(roles[1]?.role).toBe(LineRole.Metadata);
    expect(roles[2]?.role).toBe(LineRole.Metadata);
    expect(roles[3]?.role).toBe(LineRole.Metadata);
    expect(roles[6]?.role).toBe(LineRole.CategorySubtotal);
    expect(roles[7]?.role).toBe(LineRole.FooterVat);
    expect(roles[9]?.role).toBe(LineRole.FooterTotal);
  });

  it("marks Petrol Ofisi address and license lines as metadata", () => {
    const lines = [
      "PETROL OFİSİ A.Ş.",
      "ÇAVUŞÇİFTLİĞİ KÖYÜ D.YOLU ÜSTÜ",
      "NO:221/2/3 ALTINOVA/YALOVA",
      "TEL: 02264656314",
      "B. Mükellefler VD: 7290015043",
      "MERSİS NO: 0729-0015-0430-0023",
      "LİSANS NO: BAY/939-82/48208",
      "30,800 LT X 71,45",
      "V/MAX DİESEL",
      "%20  *2.200,66",
      "TOPKDV",
      "TOPLAM",
      "*2.200,66",
    ];
    const roles = rolesFor(lines);
    expect(roles.slice(0, 7).every((r) => r.role !== LineRole.BodyProduct)).toBe(true);
    expect(roles[7]?.role).toBe(LineRole.Metadata);
    expect(roles[8]?.role).toBe(LineRole.BodyProduct);
  });

  it("allows single İÇECEK POS line as body product on Tiki-style receipt", () => {
    const lines = [
      "ÇALGIN TURİZM TİCARET LTD. ŞTİ.",
      "TİKİ BEACH BODRUM ŞUBESİ",
      "BODRUM/MUĞLA",
      "MARMARİS VD: 22509211112",
      "İÇECEK %10 *365,00",
      "TOPKDV",
      "*33,18",
      "TOPLAM",
      "*365,00",
    ];
    const roles = rolesFor(lines);
    expect(roles[4]?.role).toBe(LineRole.BodyProduct);
    expect(roles.slice(0, 4).every((r) => r.role !== LineRole.BodyProduct)).toBe(true);
  });
});

describe("productPass line-role extraction", () => {
  it("never emits header, TEL, VD, or category subtotal as products (RAMZOR fixture)", () => {
    const lines = [
      "RAMZOR GIDA TURİZM LTD. ŞTİ.",
      "ŞANCAKLI MAH. MEVKİİ NO:12",
      "TEL: 0212 555 0101",
      "BÜYÜK MÜKELLEFLER V.D. 1234567890",
      "Akali Burger 160 Gr %10 *185,00",
      "Patates Kızartması %10 *95,00",
      "YİYECEK %10 *1.480,00",
      "TOPKDV",
      "*134,55",
      "TOPLAM",
      "*1.480,00",
    ];
    const products = productsFrom(lines);
    const names = products.map((p) => p.rawName);
    expect(names.some((n) => isPollutedProductName(n))).toBe(false);
    expect(names.some((n) => /RAMZOR|TEL:|V\.D\./i.test(n))).toBe(false);
    expect(names.some((n) => /^Y[İI]YECEK$/i.test(n.trim()))).toBe(false);
    expect(names.some((n) => /Akali Burger/i.test(n))).toBe(true);
    expect(names.some((n) => /Patates/i.test(n))).toBe(true);
  });

  it("extracts Tiki Beach İÇECEK without branch pollution", () => {
    const lines = [
      "ÇALGIN TURİZM TİCARET LTD. ŞTİ.",
      "TİKİ BEACH BODRUM ŞUBESİ",
      "BODRUM/MUĞLA",
      "MARMARİS VD: 22509211112",
      "11-08-2026",
      "SAAT: 23:46",
      "İÇECEK",
      "%10",
      "*365,00",
      "TOPKDV",
      "*33,18",
      "TOPLAM",
      "*365,00",
    ];
    const doc = extractReceiptDocument(lines);
    const names = doc.products.map((p) => p.rawName);
    expect(names.some((n) => isPollutedProductName(n))).toBe(false);
    expect(names.some((n) => /BODRUM|VD:/i.test(n))).toBe(false);
    expect(names.some((n) => /İÇECEK/i.test(n))).toBe(true);
    expect(doc.footer.total).toBe(365);
  });

  it("extracts Şengül Hediyelik product without VAT token as name", () => {
    const lines = [
      "ŞENGÜL HEDİYELİK",
      "12.08.2026",
      "HEDİYELİK EŞYA",
      "%20",
      "*1.000,00",
      "TOPKDV *166,67",
      "TOPLAM *1.000,00",
    ];
    const products = productsFrom(lines);
    expect(products.some((p) => p.rawName.startsWith("%"))).toBe(false);
    expect(products.some((n) => /HEDİYELİK/i.test(n.rawName))).toBe(true);
  });

  it("extracts Altınkılıçlar drinks without bare star amounts as names", () => {
    const lines = [
      "Altınkılıçlar kahve",
      "08/08/2026",
      "Sandviç Hindi",
      "Füme Keten Tohumlu %10 *215,00",
      "Espresso Double Ag %10 *125,00",
      "Cappucino Küçük Ag %10 *165,00",
      "Draft Americano Ag %10 *190,00",
      "TOPKDV *63,18",
      "TOPLAM *695,00",
    ];
    const products = productsFrom(lines);
    const names = products.map((p) => p.rawName);
    expect(names.some((n) => /^\*[\d.,]+/.test(n))).toBe(false);
    expect(names.some((n) => /^%\s*\d/.test(n))).toBe(false);
    expect(names.filter((n) => /Espresso|Cappucino|Americano|Keten/i.test(n)).length).toBeGreaterThanOrEqual(3);
  });

  it("rejects %20 and bare *amount as product names", () => {
    expect(productsFrom(["%20", "TOPKDV", "*100,00", "TOPLAM", "*100,00"]).map((p) => p.rawName)).toEqual([]);
    expect(productsFrom(["*215,00", "TOPKDV", "*20,00", "TOPLAM", "*215,00"]).map((p) => p.rawName)).toEqual([]);
  });
});
