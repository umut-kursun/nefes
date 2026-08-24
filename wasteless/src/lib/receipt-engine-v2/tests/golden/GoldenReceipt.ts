import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseVisionResult } from "../../vision/parseVisionResult";
import type { VisionMetadata, VisionResult } from "../../vision/types";
import type { GoldenExpectation } from "./GoldenExpectation";

export type GoldenReceiptMeta = {
  readonly slug: string;
  readonly label: string;
  readonly category: string;
  /** Relative path inside the fixture directory, e.g. `image.png`. */
  readonly image?: string | null;
  readonly imageNote?: string;
};

export type GoldenReceipt = {
  readonly meta: GoldenReceiptMeta;
  readonly fixtureDir: string;
  readonly ocrLines: readonly string[];
  readonly imagePath: string | null;
  readonly vision: VisionResult;
  readonly expected: GoldenExpectation;
};

type GoldenVisionFixture = {
  readonly merchant?: VisionResult["merchant"];
  readonly metadata?: VisionMetadata;
  readonly confidence?: number;
};

function goldenCasesRoot(): string {
  if (typeof __dirname !== "undefined") {
    return path.join(__dirname, "fixtures", "cases");
  }
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures",
    "cases"
  );
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readOcrLines(fixtureDir: string): string[] {
  const ocrPath = path.join(fixtureDir, "ocr.txt");
  const text = fs.readFileSync(ocrPath, "utf8");
  return text.split(/\r?\n/).filter((line) => line.length > 0);
}

function resolveImagePath(
  fixtureDir: string,
  meta: GoldenReceiptMeta
): string | null {
  if (!meta.image) return null;
  const imagePath = path.join(fixtureDir, meta.image);
  return fs.existsSync(imagePath) ? imagePath : null;
}

/** Discover fixture slugs that contain OCR input and expected output. */
export function discoverGoldenReceiptSlugs(): string[] {
  const root = goldenCasesRoot();
  if (!fs.existsSync(root)) return [];

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => {
      const dir = path.join(root, slug);
      return (
        fs.existsSync(path.join(dir, "ocr.txt")) &&
        fs.existsSync(path.join(dir, "expected.json"))
      );
    })
    .sort();
}

/** Build the VisionResult used to drive the deterministic V2 pipeline. */
export function buildVisionResult(
  receipt: Pick<GoldenReceipt, "ocrLines" | "vision">
): VisionResult {
  return parseVisionResult({
    merchant: receipt.vision.merchant,
    metadata: receipt.vision.metadata,
    confidence: receipt.vision.confidence,
    rawText: receipt.ocrLines.join("\n"),
    lines: [...receipt.ocrLines],
  });
}

export function loadGoldenReceipt(slug: string): GoldenReceipt {
  const fixtureDir = path.join(goldenCasesRoot(), slug);
  const metaPath = path.join(fixtureDir, "meta.json");
  const expectedPath = path.join(fixtureDir, "expected.json");
  const visionPath = path.join(fixtureDir, "vision.json");

  if (!fs.existsSync(path.join(fixtureDir, "ocr.txt"))) {
    throw new Error(`Golden receipt missing ocr.txt: ${slug}`);
  }
  if (!fs.existsSync(expectedPath)) {
    throw new Error(`Golden receipt missing expected.json: ${slug}`);
  }

  const meta = fs.existsSync(metaPath)
    ? readJsonFile<GoldenReceiptMeta>(metaPath)
    : ({ slug, label: slug, category: "unknown" } satisfies GoldenReceiptMeta);

  const ocrLines = readOcrLines(fixtureDir);
  const visionFixture = fs.existsSync(visionPath)
    ? readJsonFile<GoldenVisionFixture>(visionPath)
    : { merchant: { rawName: ocrLines[0] ?? null } };

  const vision = parseVisionResult({
    merchant: visionFixture.merchant,
    metadata: visionFixture.metadata,
    confidence: visionFixture.confidence,
    rawText: ocrLines.join("\n"),
    lines: ocrLines,
  });

  return {
    meta: { ...meta, slug: meta.slug ?? slug },
    fixtureDir,
    ocrLines,
    imagePath: resolveImagePath(fixtureDir, meta),
    vision,
    expected: readJsonFile<GoldenExpectation>(expectedPath),
  };
}

export function loadAllGoldenReceipts(): GoldenReceipt[] {
  return discoverGoldenReceiptSlugs().map((slug) => loadGoldenReceipt(slug));
}

/** Load OCR + vision fixtures without expected output (for snapshot generation). */
export function loadGoldenReceiptDraft(slug: string): Omit<GoldenReceipt, "expected"> {
  const fixtureDir = path.join(goldenCasesRoot(), slug);
  const metaPath = path.join(fixtureDir, "meta.json");
  const visionPath = path.join(fixtureDir, "vision.json");

  const meta = fs.existsSync(metaPath)
    ? readJsonFile<GoldenReceiptMeta>(metaPath)
    : ({ slug, label: slug, category: "unknown" } satisfies GoldenReceiptMeta);

  const ocrLines = readOcrLines(fixtureDir);
  const visionFixture = fs.existsSync(visionPath)
    ? readJsonFile<GoldenVisionFixture>(visionPath)
    : { merchant: { rawName: ocrLines[0] ?? null } };

  const vision = parseVisionResult({
    merchant: visionFixture.merchant,
    metadata: visionFixture.metadata,
    confidence: visionFixture.confidence,
    rawText: ocrLines.join("\n"),
    lines: ocrLines,
  });

  return {
    meta: { ...meta, slug: meta.slug ?? slug },
    fixtureDir,
    ocrLines,
    imagePath: resolveImagePath(fixtureDir, meta),
    vision,
  };
}

export function listGoldenReceiptDraftSlugs(): string[] {
  const root = goldenCasesRoot();
  if (!fs.existsSync(root)) return [];

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => fs.existsSync(path.join(root, slug, "ocr.txt")))
    .sort();
}
