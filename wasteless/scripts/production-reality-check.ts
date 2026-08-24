/**
 * Production Reality Check — runs real receipt PNGs through the live V2 pipeline
 * (preprocess → Vision OCR → extraction → validation → ExpenseDraft).
 * One-off diagnostic; not part of unit test suite.
 */
import "fake-indexeddb/auto";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { createCanvas, Image as CanvasImage } from "canvas";

const ASSETS =
  "C:\\Users\\ukursun\\.cursor\\projects\\c-Users-ukursun-Documents-nefes-wasteless\\assets";

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

type GroundTruth = {
  readonly id: string;
  readonly name: string;
  readonly imagePath?: string;
  readonly merchantContains: string;
  readonly total: number;
  readonly vat?: number;
  readonly productCount?: number;
  readonly productNames?: readonly string[];
  readonly paymentCount: number;
  readonly paymentAmount?: number;
  readonly categoryId: string;
  readonly subcategoryHint?: string;
  readonly fuelType?: string;
  readonly fuelQty?: number;
  readonly fuelUnitPrice?: number;
  readonly plate?: string;
  readonly date?: string;
  readonly time?: string;
};

const RECEIPTS: GroundTruth[] = [
  {
    id: "A",
    name: "Migros 0347",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug_1-dca82703-5eae-4a72-81e3-2dc409ef3a2e.png`,
    merchantContains: "Migros",
    total: 477.9,
    vat: 33.99,
    productCount: 5,
    productNames: ["Coca", "Lipton", "Patates", "Poşet", "Selpak"],
    paymentCount: 1,
    paymentAmount: 477.9,
    categoryId: "market",
    date: "2026-08-16",
    time: "19:33",
  },
  {
    id: "B",
    name: "5M Migros 0242",
    merchantContains: "5M",
    total: 1978.99,
    vat: 127.22,
    productCount: 16,
    paymentCount: 1,
    paymentAmount: 1978.99,
    categoryId: "market",
    date: "2026-08-15",
    time: "21:38",
  },
  {
    id: "C",
    name: "File Market",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-9-8fa7c14e-230a-4955-9066-42b31b6c49f8.png`,
    merchantContains: "File Market",
    total: 1118.83,
    vat: 18.67,
    productCount: 16,
    paymentCount: 1,
    paymentAmount: 1118.83,
    categoryId: "market",
  },
  {
    id: "D",
    name: "Tiki Beach",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-8-3bb113b5-83ba-4d2c-ac86-90a7ff6c9ba0.png`,
    merchantContains: "Tiki",
    total: 365.0,
    vat: 33.18,
    productCount: 1,
    productNames: ["İÇECEK"],
    paymentCount: 1,
    paymentAmount: 365.0,
    categoryId: "yeme_icme",
    date: "2026-08-11",
    time: "23:46",
  },
  {
    id: "E",
    name: "Altınkılıçlar",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-7-d7822ab1-52dc-4572-ba35-92b7a83da708.png`,
    merchantContains: "Altınkılıç",
    total: 695.0,
    vat: 63.18,
    productCount: 4,
    productNames: ["Keten", "Espresso", "Cappuccino", "Americano"],
    paymentCount: 1,
    paymentAmount: 695.0,
    categoryId: "yeme_icme",
    date: "2026-08-08",
    time: "10:49",
  },
  {
    id: "F",
    name: "Petrol Ofisi",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-6-dfdd6685-0287-4ddd-b093-d1efb11ae06e.png`,
    merchantContains: "Petrol",
    total: 2200.66,
    vat: 366.78,
    productCount: 1,
    productNames: ["DIESEL", "Motorin", "Dizel"],
    paymentCount: 1,
    paymentAmount: 2200.66,
    categoryId: "akaryakit",
    subcategoryHint: "motorin",
    fuelType: "motorin",
    fuelQty: 30.8,
    fuelUnitPrice: 71.45,
    plate: "3400",
  },
  {
    id: "G",
    name: "Çehre Gıda",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-4-2b4f3c0e-f99a-47a8-99ad-bdfb6b6b1602.png`,
    merchantContains: "Çehre",
    total: 3704.0,
    vat: 336.73,
    productCount: 8,
    paymentCount: 1,
    paymentAmount: 3704.0,
    categoryId: "yeme_icme",
    date: "2026-08-11",
    time: "21:16",
  },
  {
    id: "H",
    name: "Şengül Hediyelik",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug-3-f5528bc9-37de-45f6-890c-af8d145e9d2a.png`,
    merchantContains: "Şengül",
    total: 1000.0,
    productCount: 1,
    productNames: ["Hediyelik", "HEDİYELİK"],
    paymentCount: 1,
    paymentAmount: 1000.0,
    categoryId: "diger",
    date: "2026-08-12",
    time: "00:05",
  },
  {
    id: "I",
    name: "Özyıldız Petrol",
    imagePath: `${ASSETS}\\c__Users_ukursun_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_aug_2-197c8431-41b6-4fc5-a0d0-404b5a04c7a1.png`,
    merchantContains: "Özyıldız",
    total: 1000.0,
    productCount: 1,
    productNames: ["MOTORİN", "Motorin"],
    paymentCount: 1,
    paymentAmount: 1000.0,
    categoryId: "akaryakit",
    subcategoryHint: "motorin",
    fuelType: "motorin",
    fuelQty: 12.5,
    fuelUnitPrice: 79.99,
    plate: "34",
    date: "2026-08-08",
    time: "12:19",
  },
];

function nearlyEqual(a: number | null | undefined, b: number, tol = 0.02): boolean {
  if (a == null || !Number.isFinite(a)) return false;
  return Math.abs(a - b) <= tol;
}

function fold(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

function nameMatches(actual: string, hints: readonly string[]): boolean {
  const f = fold(actual);
  return hints.some((h) => f.includes(fold(h)));
}

type RunResult = {
  id: string;
  name: string;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
  merchant?: string;
  date?: string | null;
  time?: string | null;
  productCount?: number;
  productNames?: string[];
  quantities?: (number | null)[];
  unitPrices?: (number | null)[];
  vat?: number | null;
  total?: number | null;
  paymentCount?: number;
  paymentAmounts?: number[];
  category?: string;
  subcategory?: string | null;
  fuel?: Record<string, unknown> | null;
  analysisStatus?: string;
  parseStatus?: string;
  engineUsed?: string;
  engineFallback?: boolean;
  totalMs?: number;
  preprocessMs?: number;
  visionMs?: number;
  ocrMs?: number;
  extractionMs?: number;
  validationMs?: number;
  purchaseDraftMs?: number;
  safety?: Record<string, boolean>;
  classification?: "PASS" | "PARTIAL" | "FAIL";
  rootCause?: string;
};

async function runOneReceipt(
  gt: GroundTruth,
  { purchaseDraftToExpenseDraft }: { purchaseDraftToExpenseDraft: typeof import("@/lib/expense-factory").purchaseDraftToExpenseDraft },
  { routeReceiptEngineAnalysis }: { routeReceiptEngineAnalysis: typeof import("@/lib/receipt-engine-v2-integration/analyzeWithEngineRouter").routeReceiptEngineAnalysis },
  { preprocessReceiptImage }: { preprocessReceiptImage: typeof import("@/lib/receipt-image-preprocess").preprocessReceiptImage },
  { DEFAULT_CATEGORIES }: { DEFAULT_CATEGORIES: typeof import("@/lib/categories").DEFAULT_CATEGORIES }
): Promise<RunResult> {
  const base: RunResult = { id: gt.id, name: gt.name };

  if (!gt.imagePath || !fs.existsSync(gt.imagePath)) {
    return {
      ...base,
      skipped: true,
      skipReason: "Image file not found in workspace assets",
      classification: "FAIL",
      rootCause: "Original receipt image unavailable — cannot run live Vision OCR",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ...base, error: "OPENAI_API_KEY missing", classification: "FAIL" };
  }

  process.env.USE_RECEIPT_ENGINE_V2 = "true";

  const buf = fs.readFileSync(gt.imagePath);
  const pipelineStart = Date.now();
  const primaryDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  // Browser preprocess (enhanced + threshold) requires DOM canvas; Node harness sends raw PNG to Vision.
  const preprocessMs = 0;
  const altDataUrl = primaryDataUrl;

  const routed = await routeReceiptEngineAnalysis({
    imageDataUrl: primaryDataUrl,
    altImageDataUrl: altDataUrl,
    apiKey,
    sourceHint: `reality-check-${gt.id}`,
  });

  if ("error" in routed) {
    return {
      ...base,
      error: routed.error,
      totalMs: Date.now() - pipelineStart,
      classification: "FAIL",
      rootCause: routed.error,
    };
  }

  const parseStatus =
    routed.validation.analysisStatus === "approved"
      ? "pending_approval"
      : routed.validation.analysisStatus === "needs_review"
        ? "needs_review"
        : "failed";

  const categories = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const expense = purchaseDraftToExpenseDraft(routed.purchase, {
    ocrRawText: routed.ocrRawText,
    categories,
  });

  const p = routed.purchase;
  const productNames = (p.products ?? []).map((x) => x.name);
  const paymentAmounts = (p.payments ?? [])
    .map((x) => x.amount)
    .filter((x): x is number => x != null);

  const taxes = p.taxes ?? [];
  const vatAmount =
    taxes.find((t) => t.kind === "vat_total")?.amount ??
    taxes.find((t) => t.label?.toUpperCase().includes("KDV"))?.amount ??
    null;

  const safety = {
    vatNotPayment: !(p.payments ?? []).some((pay) => vatAmount != null && nearlyEqual(pay.amount, vatAmount, 0.01)),
    totalNotPaymentDuplicate:
      (p.payments ?? []).filter((pay) => nearlyEqual(pay.amount, gt.total, 0.01)).length <= 1,
    cardNotProduct: !productNames.some((n) => /#{0,2}\d{4,}\*+\d{4}/.test(n) || /\*{4,}\d{4}/.test(n)),
    cardNotPaymentAmount: !paymentAmounts.some((a) => String(a).length >= 12),
    paymentMethodPaired: (p.payments ?? []).every((pay) => pay.method != null || pay.amount != null),
    missingTotalNotApproved: !(p.total?.amount == null && parseStatus === "pending_approval"),
    productNotVatToken: !productNames.some((n) => /^%?\s*\d{1,2}$/.test(n.trim())),
    fuelCategoryFuelReceipt:
      gt.categoryId !== "akaryakit" || expense.category === "akaryakit",
  };

  const failures: string[] = [];

  if (!fold(p.merchant ?? "").includes(fold(gt.merchantContains))) {
    failures.push(`merchant: got "${p.merchant}"`);
  }
  if (!nearlyEqual(p.total?.amount, gt.total, 0.02)) {
    failures.push(`total: got ${p.total?.amount} expected ${gt.total}`);
  }
  if (gt.vat != null && !nearlyEqual(vatAmount, gt.vat, 0.05)) {
    failures.push(`vat: got ${vatAmount} expected ${gt.vat}`);
  }
  if (gt.productCount != null && (p.products ?? []).length !== gt.productCount) {
    failures.push(`productCount: got ${(p.products ?? []).length} expected ${gt.productCount}`);
  }
  if (gt.productNames?.length) {
    const anyMatch = gt.productNames.some((hint) =>
      productNames.some((n) => nameMatches(n, [hint]))
    );
    if (!anyMatch && productNames.length > 0) {
      failures.push(`product names mismatch: ${productNames.join("; ")}`);
    } else if (productNames.length === 0) {
      failures.push("no products extracted");
    }
  }
  if (p.payments?.length !== gt.paymentCount) {
    failures.push(`paymentCount: got ${p.payments?.length ?? 0} expected ${gt.paymentCount}`);
  }
  if (gt.paymentAmount != null) {
    const payOk = paymentAmounts.some((a) => nearlyEqual(a, gt.paymentAmount!, 0.02));
    if (!payOk) failures.push(`payment amounts: ${paymentAmounts.join(", ")}`);
  }
  if (expense.category !== gt.categoryId) {
    failures.push(`category: got ${expense.category} expected ${gt.categoryId}`);
  }
  if (gt.fuelType && expense.fuel?.fuelType) {
    if (!fold(expense.fuel.fuelType).includes(fold(gt.fuelType))) {
      failures.push(`fuelType: got ${expense.fuel.fuelType}`);
    }
  } else if (gt.fuelType && !expense.fuel?.fuelType) {
    failures.push("fuelType missing");
  }
  if (gt.fuelQty != null && expense.fuel?.liters != null) {
    if (!nearlyEqual(expense.fuel.liters, gt.fuelQty, 0.05)) {
      failures.push(`fuel qty: got ${expense.fuel.liters}`);
    }
  }
  if (gt.plate && expense.fuel?.plate) {
    if (!fold(expense.fuel.plate).includes(fold(gt.plate))) {
      failures.push(`plate: got ${expense.fuel.plate}`);
    }
  } else if (gt.plate && gt.categoryId === "akaryakit" && !expense.fuel?.plate) {
    failures.push("plate missing");
  }
  if (parseStatus === "pending_approval" && failures.length > 0) {
    failures.push("incorrectly approved despite extraction errors");
  }

  let classification: "PASS" | "PARTIAL" | "FAIL";
  if (failures.length === 0) {
    classification =
      parseStatus === "needs_review" && gt.id === "A" ? "PASS" : parseStatus === "failed" ? "PARTIAL" : "PASS";
  } else if (
    nearlyEqual(p.total?.amount, gt.total, 0.02) &&
    parseStatus === "needs_review"
  ) {
    classification = "PARTIAL";
  } else if (!nearlyEqual(p.total?.amount, gt.total, 0.02)) {
    classification = "FAIL";
  } else {
    classification = failures.length <= 2 ? "PARTIAL" : "FAIL";
  }

  return {
    ...base,
    merchant: p.merchant ?? undefined,
    date: p.date ?? expense.date,
    time: p.time ?? expense.time,
    productCount: (p.products ?? []).length,
    productNames,
    quantities: (p.products ?? []).map((x) => x.quantity ?? null),
    unitPrices: (p.products ?? []).map((x) => x.unitPrice ?? x.normalizedUnitPrice ?? null),
    vat: vatAmount,
    total: p.total?.amount ?? null,
    paymentCount: p.payments?.length ?? 0,
    paymentAmounts,
    category: expense.category,
    subcategory: expense.subcategory,
    fuel: expense.fuel as Record<string, unknown> | null,
    analysisStatus: routed.validation.analysisStatus,
    parseStatus,
    engineUsed: routed.engineUsed,
    engineFallback: routed.engineFallback,
    totalMs: Date.now() - pipelineStart,
    preprocessMs,
    visionMs: routed.performance.visionMs,
    ocrMs: routed.performance.ocrMs,
    extractionMs: routed.performance.extractionMs,
    validationMs: routed.performance.validationMs,
    purchaseDraftMs: routed.performance.purchaseDraftMs,
    safety,
    classification,
    rootCause: failures.length ? failures.join("; ") : undefined,
  };
}

async function testPersistence(
  sample: RunResult,
  modules: {
    db: import("@/lib/db").WasteLessDB | null;
    saveExpense: typeof import("@/lib/db").saveExpense;
  }
): Promise<{ ok: boolean; detail: string }> {
  const { db, saveExpense } = modules;
  if (!db) {
    return { ok: false, detail: "Dexie db singleton unavailable in Node harness" };
  }
  await db.open();

  const row = {
    id: "exp_persist_test",
    sourceType: "receipt" as const,
    parseStatus: (sample.parseStatus ?? "needs_review") as import("@/lib/types").Expense["parseStatus"],
    date: sample.date ?? "2026-08-11",
    time: sample.time ?? null,
    merchantName: sample.merchant ?? "Çehre Gıda",
    merchantRaw: sample.merchant ?? null,
    category: sample.category ?? "yeme_icme",
    subcategory: sample.subcategory ?? null,
    tagIds: [] as string[],
    totalAmount: sample.total ?? 3704,
    currency: "TRY" as const,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rawText: "persist-probe",
    confidence: 0.9,
    imageDataUrl: null,
    aiResponseJson: null,
    fuel: null,
    packCount: null,
    quickButtonId: null,
    items: [],
    charges: [],
    discounts: [],
    payments: [],
    unknownLines: [],
  };

  await saveExpense(row);
  const reloaded = await db.expenses.get("exp_persist_test");
  await db.delete();

  if (!reloaded) return { ok: false, detail: "Expense not found after save" };
  if (reloaded.parseStatus !== row.parseStatus) {
    return {
      ok: false,
      detail: `parseStatus lost: ${reloaded.parseStatus} !== ${row.parseStatus}`,
    };
  }
  if (reloaded.totalAmount !== row.totalAmount) {
    return {
      ok: false,
      detail: `totalAmount lost: ${reloaded.totalAmount} !== ${row.totalAmount}`,
    };
  }
  return { ok: true, detail: "Dexie round-trip preserved parseStatus and totalAmount" };
}

async function main(): Promise<void> {
  loadEnvLocal();
  setupBrowserPolyfills();

  const { routeReceiptEngineAnalysis } = await import(
    "@/lib/receipt-engine-v2-integration/analyzeWithEngineRouter"
  );
  const { purchaseDraftToExpenseDraft } = await import("@/lib/expense-factory");
  const { preprocessReceiptImage } = await import("@/lib/receipt-image-preprocess");
  const { DEFAULT_CATEGORIES } = await import("@/lib/categories");
  const { saveExpense, db } = await import("@/lib/db");

  const mods = {
    routeReceiptEngineAnalysis,
    purchaseDraftToExpenseDraft,
    preprocessReceiptImage,
    DEFAULT_CATEGORIES,
    db,
    saveExpense,
  };

  console.log("=== Production Reality Check (live Vision OCR) ===\n");

  const results: RunResult[] = [];
  const outPath = path.join(process.cwd(), "reports", "production-reality-check.json");

  const flush = () => {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({ results }, null, 2));
  };

  for (const gt of RECEIPTS) {
    console.log(`Running ${gt.id} — ${gt.name}...`);
    const r = await runOneReceipt(gt, mods, mods, mods, mods);
    results.push(r);
    flush();
    console.log(
      `  ${r.skipped ? "SKIPPED" : r.classification} · ${r.totalMs ?? 0}ms · total=${r.total} · status=${r.parseStatus}`
    );
  }

  console.log("\n=== Concurrency (A + I parallel) ===");
  const [cA, cI] = await Promise.all([
    runOneReceipt(RECEIPTS[0]!, mods, mods, mods, mods),
    runOneReceipt(RECEIPTS[8]!, mods, mods, mods, mods),
  ]);
  const concurrencyOk =
    cA.merchant &&
    cI.merchant &&
    fold(cA.merchant).includes("migros") &&
    fold(cI.merchant).includes("ozyildiz") &&
    nearlyEqual(cA.total, 477.9, 0.02) &&
    nearlyEqual(cI.total, 1000, 0.02);
  console.log(
    concurrencyOk
      ? `  PASS — A=${cA.merchant}/${cA.total} I=${cI.merchant}/${cI.total}`
      : `  FAIL — A=${cA.merchant}/${cA.total} I=${cI.merchant}/${cI.total}`
  );

  const persistSample = results.find((r) => r.id === "G" && !r.skipped) ?? results.find((r) => !r.skipped);
  let persistence = { ok: false, detail: "No completed run for persistence probe" };
  if (persistSample) {
    persistence = await testPersistence(persistSample, mods);
    console.log(`\n=== Persistence ===\n  ${persistence.ok ? "PASS" : "FAIL"} — ${persistence.detail}`);
  }

  fs.writeFileSync(
    outPath,
    JSON.stringify({ results, concurrency: { cA, cI, ok: concurrencyOk }, persistence }, null, 2)
  );
  console.log(`\nFull JSON: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
