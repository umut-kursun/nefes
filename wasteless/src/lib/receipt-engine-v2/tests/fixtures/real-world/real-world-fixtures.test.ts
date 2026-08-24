import { describe, expect, it } from "vitest";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import { runReceiptEngineV2 } from "@/lib/receipt-engine-v2/engine/runReceiptEngineV2";
import { v2PurchaseToPurchaseDraft } from "@/lib/receipt-engine-v2-integration/v2PurchaseToPurchaseDraft";
import type { VisionResult } from "@/lib/receipt-engine-v2/vision/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(
  process.cwd(),
  "src/lib/receipt-engine-v2/tests/fixtures/real-world"
);

function loadOcr(id: string): string[] {
  const text = readFileSync(join(FIXTURE_DIR, id, "ocr.txt"), "utf8");
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0);
}

function runFixture(
  lines: string[],
  merchant: string,
  meta?: Partial<VisionResult["metadata"]>
) {
  const vision: VisionResult = {
    rawText: lines.join("\n"),
    lines,
    merchant: { rawName: merchant, rawAddress: null, rawTaxNumber: null },
    metadata: {
      purchaseDate: meta?.purchaseDate ?? null,
      purchaseTime: meta?.purchaseTime ?? null,
      receiptNumber: meta?.receiptNumber ?? null,
      currency: "TRY",
    },
    confidence: 0.72,
  };
  const engine = runReceiptEngineV2(vision);
  const draft = v2PurchaseToPurchaseDraft(
    engine.purchase,
    vision,
    engine.receiptDocument
  );
  const validation = buildValidationReport(draft);
  return { engine, draft, validation };
}

describe("Phase 1 real-world receipt fixtures", () => {
  it("A — Migros 0347 (split footer OCR)", () => {
    const lines = loadOcr("migros-0347");
    const { draft, validation } = runFixture(lines, "MIGROS", {
      purchaseDate: "16/08/2026",
      purchaseTime: "19:33",
      receiptNumber: "0347",
    });

    expect(draft.total?.amount).toBe(477.9);
    expect(draft.vatSummary[0]?.amount).toBe(33.99);
    expect(draft.products.length).toBeGreaterThanOrEqual(4);
    expect(draft.payments).toHaveLength(1);
    expect(draft.payments[0]?.amount).toBe(477.9);
    expect(draft.products.some((p) => /^%\s*\d/.test(p.name))).toBe(false);
    expect(validation.analysisStatus).not.toBe("approved");
    expect(validation.isValid).toBe(false);
  });

  it("D — Tiki Beach", () => {
    const lines = loadOcr("tiki-beach");
    const { draft, validation } = runFixture(lines, "TİKİ BEACH", {
      purchaseDate: "11/08/2026",
      purchaseTime: "23:46",
      receiptNumber: "58",
    });

    expect(draft.total?.amount).toBe(365);
    expect(draft.vatSummary[0]?.amount).toBe(33.18);
    expect(draft.products.length).toBeGreaterThanOrEqual(1);
    expect(draft.products[0]?.name.toUpperCase()).toContain("İÇECEK");
    expect(draft.payments.length).toBeLessThanOrEqual(1);
    expect(draft.payments[0]?.amount).toBe(365);
    expect(validation.isValid).toBe(false);
    expect(validation.analysisStatus).toBe("needs_review");
  });

  it("E — Altınkılıçlar Kahve", () => {
    const lines = loadOcr("altinkiliclar");
    const { draft, validation } = runFixture(lines, "Altınkılıçlar Kahve", {
      purchaseDate: "08/08/2026",
      purchaseTime: "10:49:30",
      receiptNumber: "0044",
    });

    expect(draft.total?.amount).toBe(695);
    expect(draft.vatSummary[0]?.amount).toBe(63.18);
    expect(draft.products.length).toBe(4);
    expect(draft.payments).toHaveLength(1);
    expect(draft.payments[0]?.amount).toBe(695);
    expect(validation.isValid).toBe(true);
  });

  it("H — Şengül Hediyelik (multi-line product)", () => {
    const lines = loadOcr("sengul-hediyelik");
    const { draft, validation } = runFixture(lines, "ŞENGÜL HEDİYELİK", {
      purchaseDate: "12/08/2026",
      purchaseTime: "00:05",
      receiptNumber: "0001",
    });

    expect(draft.total?.amount).toBe(1000);
    expect(draft.vatSummary[0]?.amount).toBe(166.67);
    expect(draft.products).toHaveLength(1);
    expect(draft.products[0]?.name.toUpperCase()).toContain("HEDİYELİK");
    expect(draft.products[0]?.vatRate).toBe(20);
    expect(draft.products[0]?.lineTotal).toBe(1000);
    expect(draft.payments).toHaveLength(1);
    expect(draft.payments[0]?.amount).toBe(1000);
    expect(validation.isValid).toBe(true);
    expect(draft.products.some((p) => p.name.startsWith("%"))).toBe(false);
  });

  it("I — Özyıldız Petrol (commercial rounding)", () => {
    const lines = loadOcr("ozyildiz-petrol");
    const { draft, validation } = runFixture(lines, "ÖZYILDIZ PETROL", {
      purchaseDate: "08/08/2026",
      purchaseTime: "12:19",
      receiptNumber: "0014",
    });

    expect(draft.total?.amount).toBe(1000);
    expect(draft.fuel?.plateNumber).toMatch(/34\s*UP\s*8195/i);
    expect(draft.fuel?.fuelType).toBe("Motorin");
    expect(draft.products[0]?.quantity).toBeCloseTo(12.5, 2);
    expect(draft.products[0]?.unitPrice).toBeCloseTo(79.99, 2);
    expect(draft.payments).toHaveLength(1);
    expect(draft.payments[0]?.amount).toBe(1000);
    expect(validation.analysisStatus).toBe("approved");
    expect(validation.isValid).toBe(true);
    expect(
      validation.errors.some((e) => e.code === "LINE_TOTAL_MISMATCH")
    ).toBe(false);
  });
});
