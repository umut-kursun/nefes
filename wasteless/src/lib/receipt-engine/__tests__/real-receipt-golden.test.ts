import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { reconstructLayout } from "@/lib/receipt-engine/layer-2-layout/layoutReconstructor";
import { buildReceiptGraph } from "@/lib/receipt-engine/layer-3-graph/buildReceiptGraph";
import { buildClassifiedGraph } from "@/lib/receipt-engine/layer-4-classify/buildClassifiedGraph";
import { buildBlockDocument } from "@/lib/receipt-engine/layer-5-blocks/buildBlockDocument";
import { buildPurchaseDraft } from "@/lib/receipt-engine/layer-6-purchase/buildPurchaseDraft";
import { buildValidationReport } from "@/lib/receipt-engine/layer-7-validate/buildValidationReport";
import { stripValidatedPurchase } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import {
  REAL_RECEIPT_CATALOG,
  loadRealReceiptOcr,
  realReceiptExpectedDir,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";

function runFullPipeline(ref: (typeof REAL_RECEIPT_CATALOG)[number]) {
  const ocr = loadRealReceiptOcr(ref);
  const layout = reconstructLayout(ocr, "generic-tr");
  const graph = buildReceiptGraph(layout);
  const classified = buildClassifiedGraph(graph);
  const blocks = buildBlockDocument(classified);
  const purchase = buildPurchaseDraft(blocks);
  const validation = buildValidationReport(purchase);
  return { layout, purchase, validation };
}

function loadGolden<T>(ref: (typeof REAL_RECEIPT_CATALOG)[number], stage: string): T {
  const goldenPath = path.join(
    realReceiptExpectedDir(ref),
    `${ref.name}.${stage}.json`
  );
  return JSON.parse(fs.readFileSync(goldenPath, "utf8")) as T;
}

/** Product names that indicate footer/total leakage into products. */
const FOOTER_LEAKAGE_PATTERN =
  /TOPLAM|TOPKDV|ORTAK|POS|Kredi|Nakit|Visa|AID|Kasiyer/i;

describe("Real Receipt Golden Suite — full pipeline L2–L7", () => {
  for (const ref of REAL_RECEIPT_CATALOG) {
    describe(`${ref.merchant}/${ref.name}`, () => {
      it("matches golden layout", () => {
        const { layout } = runFullPipeline(ref);
        const expected = loadGolden<typeof layout>(ref, "layout");
        expect(layout).toEqual(expected);
      });

      it("matches golden purchase", () => {
        const { purchase } = runFullPipeline(ref);
        const expected = loadGolden<typeof purchase>(ref, "purchase");
        expect(purchase).toEqual(expected);
      });

      it("matches golden validation", () => {
        const { purchase } = runFullPipeline(ref);
        const actual = stripValidatedPurchase(buildValidationReport(purchase));
        const expected = loadGolden<typeof actual>(ref, "validation");
        expect(actual).toEqual(expected);
      });

      it("asserts key stability fields", () => {
        const { purchase, validation } = runFullPipeline(ref);
        const golden = loadGolden<typeof purchase>(ref, "purchase");

        expect(purchase.merchant).toBeTruthy();
        expect(purchase.products.length).toBe(golden.products.length);
        if (golden.total?.amount != null) {
          expect(purchase.total?.amount).toBeCloseTo(golden.total.amount, 2);
        }
        expect(
          purchase.products.some((p) => FOOTER_LEAKAGE_PATTERN.test(p.name))
        ).toBe(false);
        expect(
          validation.errors.filter((e) => e.severity === "error")
        ).toHaveLength(0);
      });
    });
  }
});
