import fs from "fs";
import path from "path";
import { afterAll, describe, expect, it } from "vitest";
import { runReceiptPipelineV3 } from "@/lib/receipt-engine-v3";
import { loadAllGoldenFixtures } from "@/lib/receipt-engine-v3/fixtures/golden/loader";
import {
  aggregateMetrics,
  evaluateFixture,
  formatMetricsDashboard,
  type FixtureMetrics,
} from "@/lib/receipt-engine-v3/metrics/evaluate";

const fixtures = loadAllGoldenFixtures();
const metricsResults: FixtureMetrics[] = [];

describe("receipt-engine-v3 golden dataset", () => {
  it.each(fixtures.map((f) => [f.meta.slug, f] as const))(
    "%s — matches expected normalized purchase",
    (slug, fixture) => {
      const start = performance.now();
      const result = runReceiptPipelineV3(fixture.ocrText, { debug: true });
      const runtimeMs = performance.now() - start;

      const metrics = evaluateFixture(
        slug,
        fixture.meta.label,
        fixture.meta.category,
        fixture.expected,
        result,
        runtimeMs
      );
      metricsResults.push(metrics);

      if (!metrics.passed) {
        console.error(`Golden failure [${slug}]:`, metrics.failures, {
          merchant: result.purchase.merchant,
          products: result.purchase.products.map((p) => p.name),
          total: result.purchase.total?.amount,
          profile: result.purchase.profile,
        });
      }

      expect(metrics.passed, metrics.failures.join(", ")).toBe(true);
    }
  );
});

afterAll(() => {
  const dashboard = aggregateMetrics(metricsResults);
  const reportDir = path.join(process.cwd(), "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "v3-metrics.json");
  fs.writeFileSync(jsonPath, JSON.stringify(dashboard, null, 2), "utf8");
  console.log(formatMetricsDashboard(dashboard));
  console.log(`Metrics written to ${jsonPath}`);
});
