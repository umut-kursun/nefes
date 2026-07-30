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
});
