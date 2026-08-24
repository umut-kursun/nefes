/**
 * Corpus contract runner — Phase 0 harness (measurement only).
 *
 * Usage:
 *   npx tsx scripts/corpus-contract-runner.ts --tier=frozen-baseline
 *   npx tsx scripts/corpus-contract-runner.ts --tier=tier-a-replay
 *   npx tsx scripts/corpus-contract-runner.ts --tier=tier-b-live
 */
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { createCanvas, Image as CanvasImage } from "canvas";
import {
  CORPUS_RECEIPT_IDS,
  compareAnalysisStatusToBaseline,
  evaluateContractReport,
  formatScorecardMarkdown,
  getGroundTruth,
  pipelineSnapshotFromDraftBundle,
  runCorpusContractEvaluation,
  type CorpusReceiptId,
} from "@/lib/receipt-accuracy-contract";

const ASSETS =
  "C:\\Users\\ukursun\\.cursor\\projects\\c-Users-ukursun-Documents-nefes-wasteless\\assets";

const IMAGES: Record<CorpusReceiptId, string> = {
  A: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug_1-dca82703-5eae-4a72-81e3-2dc409ef3a2e.png`,
  B: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-10-5b669958-c4ab-4698-8f92-db2f765c202a.png`,
  C: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-9-8fa7c14e-230a-4955-9066-42b31b6c49f8.png`,
  D: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-8-3bb113b5-83ba-4d2c-ac86-90a7ff6c9ba0.png`,
  E: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-7-d7822ab1-52dc-4572-ba35-92b7a83da708.png`,
  F: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-6-dfdd6685-0287-4ddd-b093-d1efb11ae06e.png`,
  G: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-4-2b4f3c0e-f99a-47a8-99ad-bdfb6b6b1602.png`,
  H: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-3-f5528bc9-37de-45f6-890c-af8d145e9d2a.png`,
  I: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug_2-197c8431-41b6-4fc5-a0d0-404b5a04c7a1.png`,
};

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function setupBrowserPolyfills(): void {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost/",
  });
  const win = dom.window;
  (globalThis as Record<string, unknown>).window = win;
  (globalThis as Record<string, unknown>).document = win.document;
  (globalThis as Record<string, unknown>).FileReader = win.FileReader;
  (globalThis as Record<string, unknown>).Blob = globalThis.Blob;
  (globalThis as Record<string, unknown>).Image = CanvasImage;

  const origCreate = win.document.createElement.bind(win.document);
  win.document.createElement = ((tag: string, options?: ElementCreationOptions) => {
    if (tag.toLowerCase() === "canvas") {
      return createCanvas(1, 1) as unknown as HTMLCanvasElement;
    }
    return origCreate(tag, options);
  }) as typeof win.document.createElement;
}

async function runTierBLive() {
  loadEnvLocal();
  setupBrowserPolyfills();
  process.env.USE_RECEIPT_ENGINE_V2 = "true";

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing — tier-b-live requires live Vision");
  }

  const { routeReceiptEngineAnalysis } = await import(
    "@/lib/receipt-engine-v2-integration/analyzeWithEngineRouter"
  );
  const { purchaseDraftToExpenseDraft } = await import("@/lib/expense-factory");
  const { DEFAULT_CATEGORIES } = await import("@/lib/categories");
  const { buildScorecard } = await import("@/lib/receipt-accuracy-contract/scorecard");

  const categories = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const snapshots = [];
  const reports = [];

  for (const id of CORPUS_RECEIPT_IDS) {
    const imagePath = IMAGES[id];
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Missing image for ${id}: ${imagePath}`);
    }
    const buf = fs.readFileSync(imagePath);
    const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    const start = Date.now();

    const routed = await routeReceiptEngineAnalysis({
      imageDataUrl: dataUrl,
      altImageDataUrl: dataUrl,
      apiKey,
      sourceHint: `corpus-contract-${id}`,
    });

    const totalMs = Date.now() - start;
    if ("error" in routed) {
      throw new Error(`${id} live pipeline failed: ${routed.error}`);
    }

    const expense = purchaseDraftToExpenseDraft(routed.purchase, {
      ocrRawText: routed.ocrRawText,
      categories,
    });

    const snap = pipelineSnapshotFromDraftBundle({
      id,
      purchase: routed.purchase,
      expense,
      analysisStatus: routed.validation.analysisStatus,
      validationErrorCodes: routed.validation.errors.map((e) => e.code),
      tier: "tier-b-live",
      timings: {
        totalMs,
        ocrMs: routed.performance.ocrMs,
        extractionMs: routed.performance.extractionMs,
        validationMs: routed.performance.validationMs,
        purchaseDraftMs: routed.performance.purchaseDraftMs,
        engineUsed: routed.engineUsed,
        engineFallback: routed.engineFallback,
      },
    });

    snapshots.push(snap);
    reports.push(evaluateContractReport(snap, getGroundTruth(id)));
    console.log(
      `${id} ${snap.analysisStatus} total=${snap.total} ${totalMs}ms engine=${routed.engineUsed}${routed.engineFallback ? " (fallback)" : ""}`
    );
  }

  return buildScorecard({
    phase: "phase-0",
    tier: "tier-b-live",
    reports,
    snapshots,
  });
}

function writeReports(scorecard: Awaited<ReturnType<typeof runCorpusContractEvaluation>>, tier: string) {
  const reportsDir = path.join(process.cwd(), "reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  const jsonPath = path.join(reportsDir, `corpus-contract-${tier}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(scorecard, null, 2));

  const mdPath = path.join(reportsDir, `corpus-contract-phase0-${tier}.md`);
  fs.writeFileSync(mdPath, formatScorecardMarkdown(scorecard));

  if (tier === "frozen-baseline") {
    fs.writeFileSync(
      path.join(reportsDir, "corpus-contract-phase0.md"),
      formatScorecardMarkdown(scorecard)
    );
  }

  console.log("Wrote", jsonPath);
  console.log("Wrote", mdPath);
}

async function main(): Promise<void> {
  const tierArg = process.argv.find((a) => a.startsWith("--tier="));
  const tier = tierArg?.split("=")[1] ?? "frozen-baseline";

  if (tier === "tier-b-live") {
    const scorecard = await runTierBLive();
    writeReports(scorecard, "tier-b-live");
    return;
  }

  if (tier !== "frozen-baseline" && tier !== "tier-a-replay") {
    throw new Error(`Unknown tier: ${tier}`);
  }

  const scorecard = runCorpusContractEvaluation(tier);
  writeReports(scorecard, tier);

  const statusRows = compareAnalysisStatusToBaseline(tier);
  console.log("\nAnalysis status vs corpus-v0 baseline:");
  for (const row of statusRows) {
    console.log(`  ${row.id}: ${row.baseline} ${row.match ? "==" : "!="} ${row.actual}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
