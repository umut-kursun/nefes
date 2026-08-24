/**
 * Step 0 — Immutable corpus baseline capture (A–I).
 * Runs the current production router path without modifying extraction/validation.
 * Artifacts are written once to baselines/corpus-v0/ and must not be silently overwritten.
 */
import "fake-indexeddb/auto";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { createCanvas, Image as CanvasImage } from "canvas";
import { OCR_ONLY_VISION_PROMPT } from "@/lib/receipt-engine-v2/vision/ocrOnlyPrompt";

const BASELINE_VERSION = "corpus-v0";
const BASELINE_DIR = path.join(process.cwd(), "baselines", BASELINE_VERSION);
const ASSETS =
  "C:\\Users\\ukursun\\.cursor\\projects\\c-Users-ukursun-Documents-nefes-wasteless\\assets";

type CorpusEntry = {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly imagePath: string;
  readonly groundTruth: {
    readonly merchantContains: string;
    readonly total: number;
    readonly vat?: number;
    readonly paymentAmount?: number;
    readonly categoryId: string;
    readonly date?: string;
    readonly time?: string;
  };
};

const CORPUS: CorpusEntry[] = [
  {
    id: "A",
    name: "Migros 0347",
    domain: "supermarket",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug_1-dca82703-5eae-4a72-81e3-2dc409ef3a2e.png`,
    groundTruth: {
      merchantContains: "Migros",
      total: 477.9,
      vat: 33.99,
      paymentAmount: 477.9,
      categoryId: "market",
      date: "2026-08-16",
      time: "19:33",
    },
  },
  {
    id: "B",
    name: "5M Migros 0242",
    domain: "supermarket",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-10-5b669958-c4ab-4698-8f92-db2f765c202a.png`,
    groundTruth: {
      merchantContains: "5M",
      total: 1978.99,
      vat: 127.22,
      paymentAmount: 1978.99,
      categoryId: "market",
      date: "2026-08-15",
      time: "21:38",
    },
  },
  {
    id: "C",
    name: "File Market",
    domain: "supermarket",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-9-8fa7c14e-230a-4955-9066-42b31b6c49f8.png`,
    groundTruth: {
      merchantContains: "File Market",
      total: 1118.83,
      vat: 18.67,
      paymentAmount: 1118.83,
      categoryId: "market",
    },
  },
  {
    id: "D",
    name: "Tiki Beach",
    domain: "restaurant",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-8-3bb113b5-83ba-4d2c-ac86-90a7ff6c9ba0.png`,
    groundTruth: {
      merchantContains: "Tiki",
      total: 365.0,
      vat: 33.18,
      paymentAmount: 365.0,
      categoryId: "yeme_icme",
      date: "2026-08-11",
      time: "23:46",
    },
  },
  {
    id: "E",
    name: "Altınkılıçlar Kahve",
    domain: "restaurant",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-7-d7822ab1-52dc-4572-ba35-92b7a83da708.png`,
    groundTruth: {
      merchantContains: "Altınkılıç",
      total: 695.0,
      vat: 63.18,
      paymentAmount: 695.0,
      categoryId: "yeme_icme",
      date: "2026-08-08",
      time: "10:49",
    },
  },
  {
    id: "F",
    name: "Petrol Ofisi",
    domain: "fuel",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-6-dfdd6685-0287-4ddd-b093-d1efb11ae06e.png`,
    groundTruth: {
      merchantContains: "Petrol",
      total: 2200.66,
      vat: 366.78,
      paymentAmount: 2200.66,
      categoryId: "akaryakit",
    },
  },
  {
    id: "G",
    name: "Çehre Gıda",
    domain: "restaurant",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-4-2b4f3c0e-f99a-47a8-99ad-bdfb6b6b1602.png`,
    groundTruth: {
      merchantContains: "Çehre",
      total: 3704.0,
      vat: 336.73,
      paymentAmount: 3704.0,
      categoryId: "yeme_icme",
      date: "2026-08-11",
      time: "21:16",
    },
  },
  {
    id: "H",
    name: "Şengül Hediyelik",
    domain: "retail",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-3-f5528bc9-37de-45f6-890c-af8d145e9d2a.png`,
    groundTruth: {
      merchantContains: "Şengül",
      total: 1000.0,
      paymentAmount: 1000.0,
      categoryId: "diger",
      date: "2026-08-12",
      time: "00:05",
    },
  },
  {
    id: "I",
    name: "Özyıldız Petrol",
    domain: "fuel",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug_2-197c8431-41b6-4fc5-a0d0-404b5a04c7a1.png`,
    groundTruth: {
      merchantContains: "Özyıldız",
      total: 1000.0,
      paymentAmount: 1000.0,
      categoryId: "akaryakit",
      date: "2026-08-08",
      time: "12:19",
    },
  },
];

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

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function ensureBaselineFresh(): void {
  const lockPath = path.join(BASELINE_DIR, "BASELINE.lock");
  if (fs.existsSync(lockPath)) {
    throw new Error(
      `Baseline ${BASELINE_VERSION} already frozen at ${lockPath}. Do not overwrite — create corpus-v1 instead.`
    );
  }
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function main(): Promise<void> {
  loadEnvLocal();
  setupBrowserPolyfills();
  ensureBaselineFresh();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing — required for live Vision baseline");
  }

  process.env.USE_RECEIPT_ENGINE_V2 = "true";

  const model = process.env.OPENAI_OCR_MODEL ?? "gpt-4o-mini";
  const promptHash = sha256(OCR_ONLY_VISION_PROMPT);
  const capturedAt = new Date().toISOString();

  const { routeReceiptEngineAnalysis } = await import(
    "@/lib/receipt-engine-v2-integration/analyzeWithEngineRouter"
  );
  const { purchaseDraftToExpenseDraft } = await import("@/lib/expense-factory");
  const { DEFAULT_CATEGORIES } = await import("@/lib/categories");

  const categories = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    createdAt: capturedAt,
    updatedAt: capturedAt,
  }));

  const summaries: Record<string, unknown>[] = [];

  for (const entry of CORPUS) {
    console.log(`\n=== Capturing ${entry.id} — ${entry.name} ===`);

    if (!fs.existsSync(entry.imagePath)) {
      throw new Error(`Image missing for ${entry.id}: ${entry.imagePath}`);
    }

    const receiptDir = path.join(BASELINE_DIR, "receipts", entry.id);
    const imageDest = path.join(BASELINE_DIR, "images", `${entry.id}.png`);
    fs.mkdirSync(path.dirname(imageDest), { recursive: true });
    fs.copyFileSync(entry.imagePath, imageDest);

    const buf = fs.readFileSync(entry.imagePath);
    const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    const pipelineStart = Date.now();

    const routed = await routeReceiptEngineAnalysis({
      imageDataUrl: dataUrl,
      altImageDataUrl: dataUrl,
      apiKey,
      model,
      sourceHint: `baseline-v0-${entry.id}`,
    });

    const totalMs = Date.now() - pipelineStart;

    if ("error" in routed) {
      const failure = {
        id: entry.id,
        name: entry.name,
        domain: entry.domain,
        error: routed.error,
        failureCode: routed.failureCode,
        capturedAt,
        totalMs,
      };
      writeJson(path.join(receiptDir, "failure.json"), failure);
      summaries.push({ ...failure, approval: "FAILED", reviewReason: routed.error });
      console.log(`  ERROR: ${routed.error}`);
      continue;
    }

    const expense = purchaseDraftToExpenseDraft(routed.purchase, {
      ocrRawText: routed.ocrRawText,
      categories,
    });

    const parseStatus =
      routed.validation.analysisStatus === "approved"
        ? "pending_approval"
        : routed.validation.analysisStatus === "needs_review"
          ? "needs_review"
          : "failed";

    const visionLines = routed.engineResult?.rawVision?.lines ?? null;
    const visionMerchant = routed.engineResult?.rawVision?.merchant ?? null;
    const visionMetadata = routed.engineResult?.rawVision?.metadata ?? null;

    let parsedVision: unknown = null;
    if (routed.rawVisionResponse) {
      try {
        parsedVision = JSON.parse(routed.rawVisionResponse);
      } catch {
        parsedVision = { raw: routed.rawVisionResponse };
      }
    }

    writeJson(path.join(receiptDir, "live-ocr.json"), {
      capturedAt,
      model,
      promptHash,
      ocrRawText: routed.ocrRawText,
      lines: visionLines,
      merchant: visionMerchant,
      metadata: visionMetadata,
      rawVisionResponse: parsedVision,
      preprocessApplied: false,
      preprocessNote:
        "Node harness sends raw PNG; client enhanced+threshold preprocess not applied",
    });

    writeJson(path.join(receiptDir, "purchase-draft.json"), routed.purchase);
    writeJson(path.join(receiptDir, "validation.json"), routed.validation);
    writeJson(path.join(receiptDir, "expense-draft.json"), expense);

    if (routed.engineResult?.receiptDocument) {
      writeJson(
        path.join(receiptDir, "receipt-document.json"),
        routed.engineResult.receiptDocument
      );
    }

    const taxes = routed.purchase.taxes ?? [];
    const vatAmount =
      taxes.find((t) => t.kind === "vat_total")?.amount ??
      taxes.find((t) => t.label?.toUpperCase().includes("KDV"))?.amount ??
      null;

    const paymentAmounts = (routed.purchase.payments ?? [])
      .map((p) => p.amount)
      .filter((a): a is number => a != null);

    const reviewReason =
      routed.validation.errors.map((e) => e.code).join(", ") ||
      routed.validation.warnings.map((w) => w.code).join(", ") ||
      null;

    const summary = {
      id: entry.id,
      name: entry.name,
      domain: entry.domain,
      merchant: routed.purchase.merchant ?? null,
      total: routed.purchase.total?.amount ?? null,
      vat: vatAmount,
      productCount: routed.purchase.products?.length ?? 0,
      productNames: (routed.purchase.products ?? []).map((p) => p.name),
      paymentCount: routed.purchase.payments?.length ?? 0,
      paymentAmounts,
      paymentMethods: (routed.purchase.payments ?? []).map((p) => p.method ?? null),
      category: expense.category,
      subcategory: expense.subcategory,
      analysisStatus: routed.validation.analysisStatus,
      parseStatus,
      isValid: routed.validation.isValid,
      consistent: routed.validation.consistent,
      score: routed.validation.score,
      reviewReason,
      engineUsed: routed.engineUsed,
      engineFallback: routed.engineFallback,
      parserId: routed.engineResult?.parserId ?? null,
      classification: routed.engineResult?.classification ?? null,
      timings: {
        totalMs,
        ocrMs: routed.performance.ocrMs ?? null,
        visionMs: routed.performance.visionMs ?? null,
        extractionMs: routed.performance.extractionMs ?? null,
        validationMs: routed.performance.validationMs ?? null,
        purchaseDraftMs: routed.performance.purchaseDraftMs ?? null,
      },
      groundTruth: entry.groundTruth,
      capturedAt,
    };

    writeJson(path.join(receiptDir, "summary.json"), summary);
    summaries.push(summary);

    console.log(
      `  status=${summary.analysisStatus} total=${summary.total} products=${summary.productCount} ${summary.totalMs}ms engine=${summary.engineUsed}${summary.engineFallback ? " (fallback)" : ""}`
    );
  }

  const manifest = {
    baselineVersion: BASELINE_VERSION,
    capturedAt,
    immutable: true,
    corpusIds: CORPUS.map((c) => c.id),
    model,
    promptHash,
    flags: {
      USE_RECEIPT_ENGINE_V2: process.env.USE_RECEIPT_ENGINE_V2 ?? null,
      RECEIPT_PARSER_MODE: process.env.RECEIPT_PARSER_MODE ?? "vision_first",
    },
    preprocessNote:
      "Baseline captured from Node harness with raw PNG (no client preprocess). Production Trust Gate should re-run with client preprocess before rollout.",
    receipts: summaries,
  };

  writeJson(path.join(BASELINE_DIR, "manifest.json"), manifest);

  fs.writeFileSync(
    path.join(BASELINE_DIR, "BASELINE.lock"),
    [
      `Baseline ${BASELINE_VERSION} frozen at ${capturedAt}`,
      "Do not regenerate or overwrite these artifacts.",
      "Create baselines/corpus-v1 for a new capture generation.",
      "",
    ].join("\n"),
    "utf8"
  );

  fs.writeFileSync(
    path.join(BASELINE_DIR, "README.md"),
    [
      `# Corpus Baseline ${BASELINE_VERSION}`,
      "",
      "Immutable Step 0 production reality snapshot for receipts A–I.",
      "",
      "- **Do not silently regenerate or overwrite.**",
      "- New baselines require a new version directory (e.g. `corpus-v1`).",
      "- Receipt B (5M Migros 0242) is included as mandatory supermarket regression.",
      "",
      `Captured: ${capturedAt}`,
      `Model: ${model}`,
      `OCR prompt SHA-256: ${promptHash}`,
    ].join("\n"),
    "utf8"
  );

  console.log(`\n=== Baseline frozen: ${BASELINE_DIR} ===`);
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
