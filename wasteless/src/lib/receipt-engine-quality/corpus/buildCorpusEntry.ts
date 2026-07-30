import fs from "fs";
import path from "path";
import {
  loadRealReceiptOcr,
  loadRealReceiptPurchase,
  realReceiptOcrPath,
  type RealReceiptRef,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";
import { buildDebugReport } from "../report/buildDebugReport";
import { runQualityPipelineFromOcr } from "../runQualityPipeline";
import {
  corpusArtifactPath,
  corpusEntryDir,
  type CorpusEntryRef,
} from "./corpusRegistry";

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeText(filePath: string, text: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

/** Build one corpus entry from a real receipt OCR fixture. */
export function buildCorpusEntry(entry: CorpusEntryRef): void {
  const { slug, realReceipt } = entry;
  const ocrRaw = fs.readFileSync(realReceiptOcrPath(realReceipt), "utf8");
  const ocr = loadRealReceiptOcr(realReceipt);
  const outputs = runQualityPipelineFromOcr(ocr, { collectTimings: true });
  const debugReport = buildDebugReport(outputs, { receiptId: slug });
  const golden = loadRealReceiptPurchase(realReceipt);

  const dir = corpusEntryDir(slug);
  fs.mkdirSync(dir, { recursive: true });

  writeText(corpusArtifactPath(slug, "ocr.txt"), ocrRaw);
  writeText(
    corpusArtifactPath(slug, "normalized.txt"),
    outputs.ocr.lines.join("\n")
  );
  writeJson(corpusArtifactPath(slug, "layout.json"), outputs.layout);
  writeJson(
    corpusArtifactPath(slug, "segmentation.json"),
    outputs.layout.segmentation
  );
  writeJson(corpusArtifactPath(slug, "graph.json"), outputs.graph);
  writeJson(corpusArtifactPath(slug, "purchaseDraft.json"), outputs.purchase);
  writeJson(corpusArtifactPath(slug, "validation.json"), {
    isValid: outputs.validation.isValid,
    score: outputs.validation.score,
    errors: outputs.validation.errors,
    warnings: outputs.validation.warnings,
  });
  writeJson(corpusArtifactPath(slug, "golden.json"), golden);
  writeJson(corpusArtifactPath(slug, "debugReport.json"), debugReport);
}

/** Build all corpus entries in CORPUS_CATALOG. */
export function buildAllCorpusEntries(
  entries: readonly CorpusEntryRef[]
): void {
  for (const entry of entries) {
    buildCorpusEntry(entry);
  }
}

export function loadCorpusGolden(ref: RealReceiptRef): unknown {
  const slug = ref.merchant;
  const filePath = corpusArtifactPath(slug, "golden.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
