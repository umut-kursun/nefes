import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { analyzeReceipt } from "@/lib/receipt-engine-sdk";
import { runReceiptPipelineV3 } from "@/lib/receipt-engine-v3";
import { loadAllGoldenFixtures } from "@/lib/receipt-engine-v3/fixtures/golden/loader";
import { evaluateFixture } from "@/lib/receipt-engine-v3/metrics/evaluate";
import type { GoldenExpectedPurchase } from "@/lib/receipt-engine-v3/fixtures/golden/types";
import type { ReceiptResult } from "@/lib/receipt-engine-sdk/types";
import type { PipelineResult } from "@/lib/receipt-engine-v3";

function legacyAsPipelineResult(legacy: ReceiptResult): PipelineResult {
  const p = legacy.purchase;
  return {
    purchase: {
      merchant: p.merchant ?? null,
      merchantConfidence: { value: p.confidence ?? 0, reasons: [] },
      purchaseDate: p.purchaseDate?.normalized ?? null,
      dateConfidence: { value: p.purchaseDate?.confidence ?? 0, reasons: [] },
      purchaseTime: p.purchaseTime?.normalized ?? null,
      timeConfidence: { value: p.purchaseTime?.confidence ?? 0, reasons: [] },
      receiptNumber: p.receiptNumber?.normalized ?? null,
      receiptNumberConfidence: { value: p.receiptNumber?.confidence ?? 0, reasons: [] },
      currency: p.currency ?? null,
      products: (p.products ?? []).map((prod) => ({
        name: prod.name,
        quantity: prod.quantity,
        unit: prod.unit,
        unitPrice: prod.unitPrice,
        lineTotal: prod.lineTotal,
        vatRate: prod.vatRate,
        confidence: { value: prod.confidence ?? 0, reasons: [] },
      })),
      charges: (p.charges ?? []).map((c) => ({
        label: c.label,
        amount: c.amount,
        confidence: { value: c.confidence ?? 0, reasons: [] },
      })),
      discounts: [],
      payments: (p.payments ?? []).map((pay) => ({
        label: pay.label,
        amount: pay.amount,
        confidence: { value: pay.confidence ?? 0, reasons: [] },
      })),
      vatSummary: [],
      subtotal: null,
      total: p.total
        ? {
            label: "total",
            amount: p.total.amount ?? p.total.lineTotal,
            confidence: { value: p.total.confidence ?? 0, reasons: [] },
          }
        : null,
      profile: "generic",
    },
    validation: { issues: [], score: legacy.validation.score ?? 1 },
    profile: "generic",
  };
}

function scoreLegacy(
  slug: string,
  label: string,
  category: string,
  ocrText: string,
  expected: GoldenExpectedPurchase
) {
  const start = performance.now();
  return analyzeReceipt({ ocrText }).then((legacy) => {
    const runtimeMs = performance.now() - start;
    return evaluateFixture(
      slug,
      label,
      category,
      expected,
      legacyAsPipelineResult(legacy),
      runtimeMs
    );
  });
}

describe("receipt-engine-v3 vs legacy benchmark", () => {
  it("produces comparison report for all golden fixtures", async () => {
    const fixtures = loadAllGoldenFixtures();
    const rows: Array<{
      slug: string;
      v3: boolean;
      legacy: boolean;
      winner: "v3" | "legacy" | "tie" | "both-fail";
    }> = [];

    for (const fixture of fixtures) {
      const startV3 = performance.now();
      const v3Result = runReceiptPipelineV3(fixture.ocrText);
      const v3Ms = performance.now() - startV3;
      const v3Metrics = evaluateFixture(
        fixture.meta.slug,
        fixture.meta.label,
        fixture.meta.category,
        fixture.expected,
        v3Result,
        v3Ms
      );

      const legacyMetrics = await scoreLegacy(
        fixture.meta.slug,
        fixture.meta.label,
        fixture.meta.category,
        fixture.ocrText,
        fixture.expected
      );

      let winner: "v3" | "legacy" | "tie" | "both-fail";
      if (v3Metrics.passed && !legacyMetrics.passed) winner = "v3";
      else if (!v3Metrics.passed && legacyMetrics.passed) winner = "legacy";
      else if (v3Metrics.passed && legacyMetrics.passed) winner = "tie";
      else winner = "both-fail";

      rows.push({
        slug: fixture.meta.slug,
        v3: v3Metrics.passed,
        legacy: legacyMetrics.passed,
        winner,
      });
    }

    const v3Wins = rows.filter((r) => r.winner === "v3").length;
    const legacyWins = rows.filter((r) => r.winner === "legacy").length;
    const report = {
      generatedAt: new Date().toISOString(),
      v3Wins,
      legacyWins,
      ties: rows.filter((r) => r.winner === "tie").length,
      rows,
    };
    const reportDir = path.join(process.cwd(), "reports");
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.join(reportDir, "v3-vs-legacy.json"), JSON.stringify(report, null, 2));

    expect(rows.length).toBe(fixtures.length);
    console.log(
      `Benchmark: V3 wins ${v3Wins}, Legacy wins ${legacyWins}, ties ${report.ties}`
    );
  });
});
