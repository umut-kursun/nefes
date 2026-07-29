import { describe, expect, it } from "vitest";
import {
  ChargeType,
  DiscountType,
  PaymentType,
  readChargesField,
} from "@/lib/receipt-model";
import { parseReceiptProductLines } from "@/lib/receipt-line-parser";
import { applyReceiptIntelligence } from "@/lib/receipt-intelligence";
import {
  separateReceiptLevelCharges,
} from "@/lib/receipt-quality";
import type { AnalysisResult } from "@/lib/types";

const baseAnalysis = (
  partial: Partial<AnalysisResult> & { rawText: string }
): AnalysisResult => ({
  sourceType: "receipt",
  merchantName: "MIGROS",
  date: "2026-07-28",
  time: "14:30",
  category: "market",
  subCategory: null,
  currency: "TRY",
  totalAmount: null,
  confidence: 0.9,
  items: [],
  charges: [],
  discounts: [],
  payments: [],
  unknownLines: [],
  fuel: null,
  packCount: null,
  notes: null,
  ...partial,
});

describe("Turkish supermarket receipt regression", () => {
  it("routes poşet / bag fees to charges with ChargeType.Bag", () => {
    const rawText = [
      "MIGROS",
      "Süt 1 L %1 45,90",
      "Ekmek %1 15,00",
      "Alışveriş Poşeti 0,50",
      "TOPLAM 61,40",
    ].join("\n");

    const parsed = parseReceiptProductLines(rawText);
    expect(parsed.charges).toHaveLength(1);
    expect(parsed.charges[0]).toMatchObject({
      type: ChargeType.Bag,
      label: expect.stringMatching(/po[sş]et/i),
      amount: 0.5,
    });
    expect(parsed.items.some((i) => /po[sş]et/i.test(i.name))).toBe(false);
    expect(parsed.items.some((i) => /süt|ekmek/i.test(i.name))).toBe(true);

    const productSum = parsed.items
      .filter((i) => !/toplam/i.test(i.name))
      .reduce((s, i) => s + (i.totalPrice ?? 0), 0);
    expect(productSum + parsed.charges[0]!.amount).toBeCloseTo(61.4, 1);
  });

  it("persists discounts with type and label", () => {
    const rawText = [
      "BİM",
      "Makarna 500g %1 12,50",
      "Kupon İndirim 2,50",
      "TOPLAM 10,00",
    ].join("\n");

    const parsed = parseReceiptProductLines(rawText);
    expect(parsed.discounts).toHaveLength(1);
    expect(parsed.discounts[0]?.label).toMatch(/kupon/i);
    expect(parsed.discounts[0]?.type).toBe(DiscountType.Coupon);
    expect(parsed.discounts[0]?.amount).toBe(2.5);

    const separated = separateReceiptLevelCharges(
      [
        {
          name: "Kampanya İndirim",
          totalPrice: 3,
        },
      ],
      [],
      []
    );
    expect(separated.discounts[0]).toMatchObject({
      label: "Kampanya İndirim",
      amount: 3,
    });
    expect([DiscountType.Campaign, DiscountType.Loyalty]).toContain(
      separated.discounts[0]?.type
    );
  });

  it("persists mixed payment footer lines in payments[]", () => {
    const rawText = [
      "A101",
      "Su 1.5 L %1 8,90",
      "Nakit 50,00",
      "Kredi Kart 8,90",
      "TOPLAM 8,90",
    ].join("\n");

    const parsed = parseReceiptProductLines(rawText);
    expect(parsed.payments.length).toBeGreaterThanOrEqual(2);
    expect(parsed.payments.some((p) => p.type === PaymentType.Cash)).toBe(true);
    expect(parsed.payments.some((p) => p.type === PaymentType.Card)).toBe(true);
    expect(parsed.payments.every((p) => p.label.trim().length > 0)).toBe(true);
    expect(parsed.items.some((i) => /nakit|kart/i.test(i.name))).toBe(false);

    const intel = applyReceiptIntelligence(
      baseAnalysis({
        rawText,
        items: parsed.items,
        totalAmount: 8.9,
      })
    );
    expect(intel.analysis.payments.length).toBeGreaterThanOrEqual(2);
    expect(intel.analysis.unknownLines).toBeDefined();
  });

  it("handles receipts without charges (products only)", () => {
    const rawText = [
      "CARREFOURSA",
      "Peynir 500g %1 89,90",
      "Zeytin 250g %1 34,50",
      "TOPLAM 124,40",
    ].join("\n");

    const parsed = parseReceiptProductLines(rawText);
    expect(parsed.charges).toHaveLength(0);
    expect(parsed.discounts).toHaveLength(0);
    expect(parsed.items.some((i) => /peynir/i.test(i.name))).toBe(true);
    expect(parsed.items.some((i) => /zeytin/i.test(i.name))).toBe(true);

    const intel = applyReceiptIntelligence(
      baseAnalysis({
        rawText,
        items: parsed.items.filter((i) => !/toplam/i.test(i.name)),
        totalAmount: 124.4,
      })
    );
    expect(intel.analysis.charges).toHaveLength(0);
  });

  it("migrates legacy extraCharges via readChargesField", () => {
    const legacy = readChargesField({
      extraCharges: [
        { type: "bag", label: "Market Poşeti", amount: 0.25 },
      ],
    });
    expect(legacy).toEqual([
      { type: ChargeType.Bag, label: "Market Poşeti", amount: 0.25 },
    ]);
  });

  it("separates misclassified charge lines from product items", () => {
    const intel = applyReceiptIntelligence(
      baseAnalysis({
        rawText: "MIGROS\nPoşet 0,50\nTOPLAM 0,50",
        items: [{ name: "Poşet", quantity: 1, unit: null, unitPrice: null, totalPrice: 0.5 }],
        totalAmount: 0.5,
      })
    );
    expect(intel.analysis.charges.some((c) => c.type === ChargeType.Bag)).toBe(
      true
    );
    expect(intel.analysis.items.some((i) => /po[sş]et/i.test(i.name))).toBe(
      false
    );
  });
});
