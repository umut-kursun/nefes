/**
 * Run regression benchmark and generate HTML dashboard + performance JSON.
 * Usage: npx tsx src/lib/receipt-engine-quality/scripts/generateRegressionDashboard.ts
 */
import fs from "fs";
import path from "path";
import { runRegressionBenchmark } from "../benchmark/runRegressionBenchmark";
import { generateRegressionDashboardHtml } from "../dashboard/generateRegressionDashboard";
import { buildPurchaseDiff } from "../diff/buildPurchaseDiff";
import { generateDiffViewerHtml } from "../diff/generateDiffViewer";
import {
  loadRealReceiptOcr,
  loadRealReceiptPurchase,
  REAL_RECEIPT_CATALOG,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { runQualityPipelineFromOcr } from "../runQualityPipeline";

const REPORTS_DIR = path.join(process.cwd(), "reports");
const LAST_RUN_PATH = path.join(REPORTS_DIR, "last-run.json");
const DASHBOARD_PATH = path.join(REPORTS_DIR, "regression-dashboard.html");
const DIFF_PATH = path.join(REPORTS_DIR, "receipt-diff.html");
const PERF_PATH = path.join(REPORTS_DIR, "performance.json");

function loadPreviousRun(): {
  passRate: number;
  avgConfidence: number;
  totalP95Ms: number;
} | null {
  if (!fs.existsSync(LAST_RUN_PATH)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(LAST_RUN_PATH, "utf8"));
    return {
      passRate: data.passRate ?? 0,
      avgConfidence: data.avgConfidence ?? 0,
      totalP95Ms: data.performance?.total?.p95Ms ?? 0,
    };
  } catch {
    return null;
  }
}

const summary = runRegressionBenchmark();
const previous = loadPreviousRun();

const trend =
  previous != null
    ? {
        passRateDelta: summary.passRate - previous.passRate,
        avgConfidenceDelta: summary.avgConfidence - previous.avgConfidence,
        totalMsDelta:
          summary.performance.total.p95Ms - previous.totalP95Ms,
      }
    : undefined;

fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.writeFileSync(
  DASHBOARD_PATH,
  generateRegressionDashboardHtml(summary, trend),
  "utf8"
);
fs.writeFileSync(PERF_PATH, `${JSON.stringify(summary.performance, null, 2)}\n`, "utf8");
fs.writeFileSync(LAST_RUN_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

const diffs = REAL_RECEIPT_CATALOG.map((ref) => {
  const golden = loadRealReceiptPurchase(ref);
  const actual = runQualityPipelineFromOcr(loadRealReceiptOcr(ref)).purchase;
  return buildPurchaseDiff(ref.merchant, golden, actual);
});
fs.writeFileSync(DIFF_PATH, generateDiffViewerHtml(diffs), "utf8");

console.log(`Dashboard: ${DASHBOARD_PATH}`);
console.log(`Performance: ${PERF_PATH}`);
console.log(`Diff viewer: ${DIFF_PATH}`);
console.log(
  `Pass rate: ${(summary.passRate * 100).toFixed(1)}% (${summary.receiptCount} receipts)`
);
