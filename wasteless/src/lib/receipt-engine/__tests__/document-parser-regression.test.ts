/**
 * Behavioral regression tests for real-world receipt scenarios.
 * Complements synthetic golden tests (layout/purchase/validation-golden.test.ts)
 * and the Real Receipt Golden Suite (real-receipt-golden.test.ts) which compare
 * full pipeline output against expected JSON snapshots.
 */
import { describe, expect, it } from "vitest";
import {
  REAL_RECEIPT_CATALOG,
  loadRealReceiptOcr,
  type RealReceiptRef,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { reconstructLayout } from "@/lib/receipt-engine/layer-2-layout/layoutReconstructor";
import { buildReceiptGraph } from "@/lib/receipt-engine/layer-3-graph/buildReceiptGraph";
import { buildClassifiedGraph } from "@/lib/receipt-engine/layer-4-classify/buildClassifiedGraph";
import { buildBlockDocument } from "@/lib/receipt-engine/layer-5-blocks/buildBlockDocument";
import { buildPurchaseDraft } from "@/lib/receipt-engine/layer-6-purchase/buildPurchaseDraft";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import fs from "fs";
import path from "path";
import { ocrDocumentFromRaw } from "@/lib/receipt-engine/fixtures/ocrFromRaw";
import { purchaseDraftToExpenseDraft } from "@/lib/expense-factory";

function runFullPipeline(ref: RealReceiptRef) {
  const ocr = loadRealReceiptOcr(ref);
  const layout = reconstructLayout(ocr, "generic-tr");
  const graph = buildReceiptGraph(layout);
  const classified = buildClassifiedGraph(graph);
  const blocks = buildBlockDocument(classified);
  const purchase = buildPurchaseDraft(blocks);
  const validation = buildValidationReport(purchase);
  return { layout, classified, purchase, validation };
}

function refByMerchant(merchant: RealReceiptRef["merchant"]): RealReceiptRef {
  const found = REAL_RECEIPT_CATALOG.find((r) => r.merchant === merchant);
  if (!found) throw new Error(`Missing real receipt fixture: ${merchant}`);
  return found;
}

describe("document parser regression suite", () => {
  it("Migros — merchant, products, charges, payment, totals, VAT; no footer leakage", () => {
    const { layout, purchase, validation } = runFullPipeline(
      refByMerchant("migros-ortak-pos")
    );

    expect(layout.segmentation.sections.some((s) => s.kind === "products")).toBe(
      true
    );
    expect(purchase.merchant).toMatch(/MIGROS/i);
    expect(purchase.receiptNumber?.normalized).toBe("123456");
    expect(purchase.purchaseDate?.normalized).toBe("2026-07-29");

    expect(purchase.products.map((p) => p.name)).toEqual([
      "EKMEK 750 GR",
      "SUT 1 LT",
    ]);
    expect(purchase.products.find((p) => p.name.includes("750 GR"))?.quantity).toBeUndefined();
    expect(purchase.products.find((p) => p.name.includes("SUT 1 LT"))?.quantity).toBeUndefined();

    expect(purchase.charges.some((c) => /po[sş]et/i.test(c.label))).toBe(true);
    expect(purchase.payments.some((p) => /ORTAK POS/i.test(p.label))).toBe(true);
    expect(purchase.total?.amount).toBe(61.4);
    expect(purchase.products.some((p) => /TOPLAM|ORTAK|TOPKDV|POS/i.test(p.name))).toBe(
      false
    );
    expect(validation.errors.filter((e) => e.severity === "error")).toHaveLength(0);
  });

  it("LCW — merchant from corporate name, products only in products section", () => {
    const { purchase } = runFullPipeline(refByMerchant("lcw-clothing"));
    expect(purchase.merchant).toMatch(/LC WAIKIKI/i);
    expect(purchase.products.length).toBe(2);
    expect(purchase.total?.amount).toBe(799.98);
    expect(purchase.payments.some((p) => /Kredi Kart/i.test(p.label))).toBe(true);
    expect(purchase.products.some((p) => /TOPLAM|Kredi/i.test(p.name))).toBe(false);
  });

  it("Toyzz Shop — card slip isolated from products", () => {
    const { layout, purchase } = runFullPipeline(refByMerchant("toyzz-card-slip"));
    expect(purchase.merchant).toMatch(/TOYZZ/i);
    expect(purchase.products.length).toBe(1);
    expect(purchase.products.some((p) => /AID|Visa/i.test(p.name))).toBe(false);
    expect(layout.lines.some((l) => l.sectionKind === "card_slip")).toBe(true);
  });

  it("Shell fuel — quantity in litres, unit price, line total", () => {
    const { purchase } = runFullPipeline(refByMerchant("shell-motorin"));
    expect(purchase.merchant).toMatch(/SHELL/i);
    const fuel = purchase.products[0];
    expect(fuel?.name).toMatch(/Motorin/i);
    expect(fuel?.quantity).toBeCloseTo(29.766, 2);
    expect(fuel?.unit).toBe("LT");
    expect(fuel?.unitPrice).toBeCloseTo(79.17, 2);
    expect(fuel?.lineTotal).toBeCloseTo(2356.1, 2);
    expect(purchase.total?.amount).toBeCloseTo(2356.1, 2);
  });

  it("Opet fuel — fuel line parsed correctly", () => {
    const { purchase } = runFullPipeline(refByMerchant("opet-benzin"));
    expect(purchase.merchant).toMatch(/OPET/i);
    const fuel = purchase.products[0];
    expect(fuel?.quantity).toBeCloseTo(42.15, 2);
    expect(fuel?.unit).toBe("LT");
    expect(fuel?.lineTotal).toBeCloseTo(1917.82, 2);
  });

  it("Restaurant — food lines as products, payment separate", () => {
    const { purchase } = runFullPipeline(refByMerchant("lezzet-restaurant"));
    expect(purchase.merchant).toMatch(/LEZZET/i);
    expect(purchase.products.length).toBe(2);
    expect(purchase.payments.some((p) => /Nakit/i.test(p.label))).toBe(true);
    expect(purchase.products.some((p) => /TOPLAM|Nakit/i.test(p.name))).toBe(false);
  });

  it("Pharmacy — products and footer isolation", () => {
    const { purchase } = runFullPipeline(refByMerchant("eczane-pharmacy"));
    expect(purchase.products.length).toBe(2);
    expect(purchase.total?.amount).toBe(205.5);
    expect(purchase.products.some((p) => /Kasiyer|TOPLAM/i.test(p.name))).toBe(false);
  });

  it("section state machine never returns to products after totals", () => {
    const { layout } = runFullPipeline(refByMerchant("migros-ortak-pos"));
    const states = layout.segmentation.parserStates;
    const totalsIdx = states.findIndex((_, i) =>
      /TOPLAM/i.test(layout.lines[i]?.text ?? "")
    );
    expect(totalsIdx).toBeGreaterThan(-1);
    const afterTotals = layout.segmentation.sectionByLineIndex.slice(totalsIdx);
    expect(afterTotals.includes("products")).toBe(false);
  });

  it("Opet Market — corporate merchant, not thank-you line; excludes OCR garbage product", () => {
    const fixturePath = path.join(
      __dirname,
      "../fixtures/ocr/opet-market-tuzla.txt"
    );
    const rawText = fs.readFileSync(fixturePath, "utf8");
    const layout = reconstructLayout(ocrDocumentFromRaw(rawText), "generic-tr");
    const graph = buildReceiptGraph(layout);
    const classified = buildClassifiedGraph(graph);
    const blocks = buildBlockDocument(classified);
    const purchase = buildPurchaseDraft(blocks);

    expect(purchase.merchant).toMatch(/OPET MARKET/i);
    expect(purchase.merchant).not.toMatch(/TEŞEKKÜR/i);
    expect(purchase.receiptNumber?.normalized).toBe("0094");
    expect(purchase.products.some((p) => /JDC|ADET/i.test(p.name))).toBe(false);
    expect(purchase.products.some((p) => /^KDV$/i.test(p.name))).toBe(false);
    const sum = purchase.products.reduce((s, p) => s + (p.lineTotal ?? 0), 0);
    expect(sum).toBeCloseTo(purchase.total?.amount ?? 0, 2);
  });

  it("MEPET Market Bolu — address skipped, split-line products, Fiş No, market category", () => {
    const fixturePath = path.join(
      __dirname,
      "../fixtures/ocr/mepet-market-bolu.txt"
    );
    const rawText = fs.readFileSync(fixturePath, "utf8");
    const layout = reconstructLayout(ocrDocumentFromRaw(rawText), "generic-tr");
    const graph = buildReceiptGraph(layout);
    const classified = buildClassifiedGraph(graph);
    const blocks = buildBlockDocument(classified);
    const purchase = buildPurchaseDraft(blocks);

    expect(purchase.merchant).toMatch(/MEPET|METRO PETROL/i);
    expect(purchase.receiptNumber?.normalized).toBe("1132");
    expect(purchase.total?.amount).toBeCloseTo(330, 2);

    expect(purchase.products.length).toBe(3);
    expect(purchase.products.some((p) => /VİVİDENT|VIVIDENT/i.test(p.name))).toBe(
      true
    );
    expect(purchase.products.some((p) => /KARAM/i.test(p.name))).toBe(true);
    expect(purchase.products.some((p) => /CANGA/i.test(p.name))).toBe(true);

    const vivident = purchase.products.find((p) => /VİVİDENT|VIVIDENT/i.test(p.name));
    const karam = purchase.products.find((p) => /KARAM/i.test(p.name));
    const canga = purchase.products.find((p) => /CANGA/i.test(p.name));
    expect(vivident?.lineTotal).toBeCloseTo(195, 2);
    expect(karam?.lineTotal).toBeCloseTo(75, 2);
    expect(canga?.lineTotal).toBeCloseTo(60, 2);

    expect(
      purchase.products.some((p) =>
        /GÜCÜKLER|KÖYÜ|MEVKİ|DÖRTDİVAN|NO:70/i.test(p.name)
      )
    ).toBe(false);
    expect(purchase.products.some((p) => /^\*$/i.test(p.name.trim()))).toBe(false);

    const expense = purchaseDraftToExpenseDraft(purchase, {
      ocrRawText: rawText,
      categories: [
        { id: "market", name: "Market", icon: "shopping-cart" },
        { id: "akaryakit", name: "Akaryakıt", icon: "fuel" },
        { id: "other", name: "Other", icon: "other" },
      ],
    });
    expect(expense.category).toBe("market");
    expect(expense.category).not.toBe("akaryakit");
    for (const item of expense.items) {
      expect(item.quantity).toBe(1);
      expect(item.unit?.toLowerCase()).toBe("adet");
    }
    const etiItem = expense.items.find((i) => /KARAM/i.test(i.name));
    expect(etiItem?.unitPrice).toBeCloseTo(75 / 0.05, 0);
  });

  it("Shell Alandüzü — corrupt OCR fuel lines, plate, date, no TOPKDV product", () => {
    const fixturePath = path.join(
      __dirname,
      "../fixtures/ocr/shell-alanduzu.txt"
    );
    const rawText = fs.readFileSync(fixturePath, "utf8");
    const layout = reconstructLayout(ocrDocumentFromRaw(rawText), "generic-tr");
    const graph = buildReceiptGraph(layout);
    const classified = buildClassifiedGraph(graph);
    const blocks = buildBlockDocument(classified);
    const purchase = buildPurchaseDraft(blocks);
    const validation = buildValidationReport(purchase);

    expect(purchase.merchant).toMatch(/SHELL/i);
    expect(purchase.purchaseDate?.normalized).toBe("2026-07-27");
    expect(purchase.receiptNumber?.normalized).toBe("0010");
    expect(purchase.products.length).toBe(1);
    expect(purchase.products.some((p) => /topkd|topkdv/i.test(p.name))).toBe(
      false
    );

    const fuel = purchase.products[0];
    expect(fuel?.name).toMatch(/motorin/i);
    expect(fuel?.quantity).toBeCloseTo(29.766, 2);
    expect(fuel?.unit).toBe("LT");
    expect(fuel?.unitPrice).toBeCloseTo(79.17, 2);
    expect(fuel?.lineTotal).toBeCloseTo(2356.1, 1);
    expect(purchase.total?.amount).toBeCloseTo(2356.1, 2);
    expect(purchase.payments.some((p) => /K\.?\s*KARTI/i.test(p.label))).toBe(
      true
    );
    expect(
      purchase.payments.some((p) => /KART HİZMETİ HAKKINDA/i.test(p.label))
    ).toBe(false);
    expect(validation.errors.some((e) => e.code === "TOTAL_MISMATCH")).toBe(
      false
    );
  });

  it("Sivaslı Dönerci — X10 as VAT not qty, PATATES, no card slip payments", () => {
    const fixturePath = path.join(
      __dirname,
      "../fixtures/ocr/sivasli-donerci.txt"
    );
    const rawText = fs.readFileSync(fixturePath, "utf8");
    const layout = reconstructLayout(ocrDocumentFromRaw(rawText), "generic-tr");
    const graph = buildReceiptGraph(layout);
    const classified = buildClassifiedGraph(graph);
    const blocks = buildBlockDocument(classified);
    const purchase = buildPurchaseDraft(blocks);
    const validation = buildValidationReport(purchase);

    expect(purchase.merchant).toMatch(/SİVASLI DÖNERCİ/i);
    expect(purchase.purchaseDate?.normalized).toBe("2026-07-29");
    expect(purchase.receiptNumber?.normalized).toBe("0042");
    expect(purchase.total?.amount).toBe(1010);

    expect(purchase.products.length).toBe(4);
    expect(purchase.products.some((p) => /PATATES/i.test(p.name))).toBe(true);
    expect(purchase.products.some((p) => /DÖNER/i.test(p.name))).toBe(true);
    expect(purchase.products.some((p) => /PEPSİ/i.test(p.name))).toBe(true);
    expect(purchase.products.some((p) => /null/i.test(p.name))).toBe(false);
    expect(purchase.products.every((p) => p.quantity !== 10)).toBe(true);
    expect(
      purchase.products.filter((p) => /DÖNER/i.test(p.name)).every((p) => p.vatRate === 10)
    ).toBe(true);

    expect(purchase.payments.some((p) => /NUSİLA|TEMASSIZ|KART SAHİB/i.test(p.label))).toBe(
      false
    );
    expect(purchase.purchaseTime?.normalized).not.toBe("91.82");
    expect(purchase.products.some((p) => /TOPLAM|TOPKDV/i.test(p.name))).toBe(false);

    const sum = purchase.products.reduce((s, p) => s + (p.lineTotal ?? 0), 0);
    expect(sum).toBeCloseTo(1010, 2);
    expect(validation.errors.some((e) => e.code === "TOTAL_MISMATCH")).toBe(false);
  });

  it("3 Kardeş Akaryakıt — generic fuel merchant, motorin, total, no KDV product", () => {
    const fixturePath = path.join(
      __dirname,
      "../fixtures/ocr/3-kardes-akaryakit.txt"
    );
    const rawText = fs.readFileSync(fixturePath, "utf8");
    const layout = reconstructLayout(ocrDocumentFromRaw(rawText), "generic-tr");
    const graph = buildReceiptGraph(layout);
    const classified = buildClassifiedGraph(graph);
    const blocks = buildBlockDocument(classified);
    const purchase = buildPurchaseDraft(blocks);
    const validation = buildValidationReport(purchase);
    const expense = purchaseDraftToExpenseDraft(purchase, {
      ocrRawText: rawText,
      categories: [
        { id: "akaryakit", label: "Akaryakıt", specialType: "fuel" } as import("@/lib/types").UserCategory,
      ],
    });

    expect(purchase.merchant).toMatch(/KARDEŞ AKARYAKIT/i);
    expect(purchase.total?.amount).toBeCloseTo(2767.98, 2);
    expect(purchase.products.length).toBe(1);
    expect(purchase.products[0]?.name).toMatch(/motorin/i);
    expect(purchase.products[0]?.quantity).toBeCloseTo(35.85, 2);
    expect(purchase.products[0]?.unitPrice).toBeCloseTo(77.21, 2);
    expect(purchase.products[0]?.lineTotal).toBeCloseTo(2767.98, 2);
    expect(purchase.products[0]?.vatRate).toBe(20);
    expect(purchase.products.some((p) => /^×20/i.test(p.name))).toBe(false);
    expect(expense.category).toBe("akaryakit");
    expect(expense.charges.some((c) => /kdv/i.test(c.label))).toBe(false);
    expect(validation.errors.some((e) => e.code === "TOTAL_MISMATCH")).toBe(false);
  });

  it("BST Group Restoran — no address products, YİYECEK, payment, TRY currency", () => {
    const fixturePath = path.join(
      __dirname,
      "../fixtures/ocr/bst-group-restoran.txt"
    );
    const rawText = fs.readFileSync(fixturePath, "utf8");
    const layout = reconstructLayout(ocrDocumentFromRaw(rawText), "generic-tr");
    const graph = buildReceiptGraph(layout);
    const classified = buildClassifiedGraph(graph);
    const blocks = buildBlockDocument(classified);
    const purchase = buildPurchaseDraft(blocks);
    const validation = buildValidationReport(purchase);

    expect(purchase.merchant).toMatch(/BST GROUP RESTORAN/i);
    expect(purchase.merchant).not.toMatch(/B BLOK NO/i);
    expect(purchase.currency?.normalized).toBe("TRY");
    expect(purchase.products.length).toBe(1);
    expect(purchase.products[0]?.name).toMatch(/YİYECEK/i);
    expect(purchase.products[0]?.lineTotal).toBeCloseTo(1219, 2);
    expect(purchase.products[0]?.vatRate).toBe(10);
    expect(purchase.products.some((p) => /BLOK NO|BÜYÜKÇEKMECE/i.test(p.name))).toBe(
      false
    );
    expect(purchase.payments.some((p) => /KREDİ|ZİRAAT/i.test(p.label))).toBe(true);
    expect(purchase.total?.amount).toBeCloseTo(1219, 2);
    expect(validation.warnings.some((w) => w.code === "CURRENCY_MISSING")).toBe(
      false
    );
  });

  it("BİRİNCİ PROFİTEROL — merchant/address split, TATLI name, payment amount, category", () => {
    const fixturePath = path.join(
      __dirname,
      "../fixtures/ocr/birinci-profiterol.txt"
    );
    const rawText = fs.readFileSync(fixturePath, "utf8");
    const layout = reconstructLayout(ocrDocumentFromRaw(rawText), "generic-tr");
    const graph = buildReceiptGraph(layout);
    const classified = buildClassifiedGraph(graph);
    const blocks = buildBlockDocument(classified);
    const purchase = buildPurchaseDraft(blocks);
    const validation = buildValidationReport(purchase);
    const expense = purchaseDraftToExpenseDraft(purchase, {
      ocrRawText: rawText,
      categories: [
        { id: "yeme_icme", label: "Yeme İçme" } as import("@/lib/types").UserCategory,
        { id: "market", label: "Market" } as import("@/lib/types").UserCategory,
      ],
    });

    expect(purchase.merchant).toMatch(/BİRİNCİ PROFİTEROL FİKRET DELİBAŞ/i);
    expect(purchase.merchant).not.toMatch(/CUMHURİYET MH|ÇANDARLI SK/i);
    expect(purchase.products.length).toBe(1);
    expect(purchase.products[0]?.name).toBe("TATLI");
    expect(purchase.products[0]?.lineTotal).toBeCloseTo(625, 2);
    expect(purchase.products[0]?.vatRate).toBe(10);
    expect(purchase.payments.some((p) => /Kredi Kart/i.test(p.label))).toBe(true);
    expect(
      purchase.payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)
    ).toBeCloseTo(625, 2);
    expect(purchase.total?.amount).toBeCloseTo(625, 2);
    expect(validation.errors.some((e) => e.code === "PAYMENT_SUM_MISMATCH")).toBe(
      false
    );
    expect(validation.score).toBe(100);
    expect(expense.category).toBe("yeme_icme");
  });
});
