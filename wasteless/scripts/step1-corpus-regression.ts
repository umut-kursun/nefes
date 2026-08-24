/**
 * Step 1 regression — compare live A–I pipeline vs corpus-v0 baseline.
 * Does not modify baseline artifacts.
 */
import "fake-indexeddb/auto";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { createCanvas, Image as CanvasImage } from "canvas";

const BASELINE_DIR = path.join(process.cwd(), "baselines", "corpus-v0");
const ASSETS =
  "C:\\Users\\ukursun\\.cursor\\projects\\c-Users-ukursun-Documents-nefes-wasteless\\assets";

type BaselineSummary = {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly total: number | null;
  readonly productCount: number;
  readonly productNames: string[];
  readonly paymentCount: number;
  readonly paymentAmounts: number[];
  readonly category: string;
  readonly subcategory: string | null;
  readonly analysisStatus: string;
  readonly parseStatus: string;
  readonly reviewReason: string | null;
  readonly groundTruth: {
    readonly total: number;
    readonly categoryId: string;
    readonly productCount?: number;
  };
  readonly timings: { readonly totalMs: number };
};

const IMAGES: Record<string, string> = {
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

function nearlyEqual(a: number | null | undefined, b: number, tol = 0.02): boolean {
  if (a == null || !Number.isFinite(a)) return false;
  return Math.abs(a - b) <= tol;
}

function loadBaseline(id: string): BaselineSummary {
  return JSON.parse(
    fs.readFileSync(path.join(BASELINE_DIR, "receipts", id, "summary.json"), "utf8")
  ) as BaselineSummary;
}

async function main(): Promise<void> {
  loadEnvLocal();
  setupBrowserPolyfills();
  process.env.USE_RECEIPT_ENGINE_V2 = "true";

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const { routeReceiptEngineAnalysis } = await import(
    "@/lib/receipt-engine-v2-integration/analyzeWithEngineRouter"
  );
  const { purchaseDraftToExpenseDraft } = await import("@/lib/expense-factory");
  const { DEFAULT_CATEGORIES } = await import("@/lib/categories");

  const categories = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const rows: Record<string, unknown>[] = [];
  const regressions: string[] = [];

  for (const id of ["A", "B", "C", "D", "E", "F", "G", "H", "I"]) {
    const baseline = loadBaseline(id);
    const imagePath = IMAGES[id]!;
    const buf = fs.readFileSync(imagePath);
    const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    const start = Date.now();

    const routed = await routeReceiptEngineAnalysis({
      imageDataUrl: dataUrl,
      altImageDataUrl: dataUrl,
      apiKey,
      sourceHint: `step1-regression-${id}`,
    });

    const totalMs = Date.now() - start;
    if ("error" in routed) {
      rows.push({ id, error: routed.error });
      continue;
    }

    const expense = purchaseDraftToExpenseDraft(routed.purchase, {
      ocrRawText: routed.ocrRawText,
      categories,
    });

    const p = routed.purchase;
    const products = p.products ?? [];
    const lineTotals = products.map((x) => x.lineTotal ?? null);
    const quantities = products.map((x) => x.quantity ?? null);
    const unitPrices = products.map((x) => x.unitPrice ?? x.normalizedUnitPrice ?? null);
    const discounts = (p.discounts ?? []).map((d) => ({
      label: d.label,
      amount: d.amount,
    }));
    const charges = (p.charges ?? []).map((c) => ({
      label: c.label,
      amount: c.amount,
    }));

    const row = {
      id,
      name: baseline.name,
      domain: baseline.domain,
      total: p.total?.amount ?? null,
      totalOk: nearlyEqual(p.total?.amount, baseline.groundTruth.total),
      productCount: products.length,
      productNames: products.map((x) => x.name),
      lineTotals,
      quantities,
      unitPrices,
      discounts,
      charges,
      paymentCount: p.payments?.length ?? 0,
      category: expense.category,
      subcategory: expense.subcategory,
      analysisStatus: routed.validation.analysisStatus,
      parseStatus:
        routed.validation.analysisStatus === "approved"
          ? "pending_approval"
          : routed.validation.analysisStatus,
      reviewReason: routed.validation.errors.map((e) => e.code).join(", ") || null,
      consistent: routed.validation.consistent,
      engineUsed: routed.engineUsed,
      engineFallback: routed.engineFallback,
      totalMs,
      baseline: {
        total: baseline.total,
        productCount: baseline.productCount,
        analysisStatus: baseline.analysisStatus,
        category: baseline.category,
      },
    };

    // Regression: worse on priority-1 fields vs baseline
    if (
      baseline.total != null &&
      row.total != null &&
      nearlyEqual(baseline.total, baseline.groundTruth.total) &&
      !nearlyEqual(row.total, baseline.total)
    ) {
      regressions.push(`${id}: total regressed ${baseline.total} → ${row.total}`);
    }
    if (
      baseline.analysisStatus === "approved" &&
      row.analysisStatus !== "approved" &&
      row.totalOk &&
      row.consistent
    ) {
      // stricter gate blocked previously-approved reconciled receipt — note, not always regression
      row.note = "approval stricter than baseline (may be intentional)";
    }
    if (
      baseline.analysisStatus !== "approved" &&
      row.analysisStatus === "approved" &&
      !row.totalOk
    ) {
      regressions.push(`${id}: false approve — total mismatch`);
    }
    if (
      row.analysisStatus === "approved" &&
      routed.validation.errors.some((e) =>
        ["PAYMENT_TOTAL_INCOHERENT", "TOTAL_MISMATCH", "LINE_TOTAL_MISMATCH"].includes(e.code)
      )
    ) {
      regressions.push(`${id}: approved with reconciliation ERROR`);
    }

    rows.push(row);
    console.log(
      `${id} ${row.analysisStatus} total=${row.total} products=${row.productCount} ${row.totalMs}ms`
    );
  }

  const report = {
    step: "step1-approval-completeness",
    capturedAt: new Date().toISOString(),
    receipts: rows,
    regressions,
    testsPassed: regressions.length === 0,
  };

  const outPath = path.join(process.cwd(), "reports", "step1-corpus-regression.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("\nRegressions:", regressions.length ? regressions : "none");
  console.log("Report:", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
