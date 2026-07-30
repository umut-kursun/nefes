import fs from "fs";
import path from "path";
import {
  REAL_RECEIPT_CATALOG,
  type RealReceiptRef,
} from "@/lib/receipt-engine/fixtures/realReceiptRegistry";

export interface CorpusEntryRef {
  readonly slug: string;
  readonly realReceipt: RealReceiptRef;
}

export const CORPUS_CATALOG: readonly CorpusEntryRef[] = Object.freeze(
  REAL_RECEIPT_CATALOG.map((ref) => ({
    slug: ref.merchant,
    realReceipt: ref,
  }))
);

const CORPUS_ROOT = path.join(
  __dirname,
  "../../receipt-engine/fixtures/corpus"
);

export function corpusEntryDir(slug: string): string {
  return path.join(CORPUS_ROOT, slug);
}

export function corpusArtifactPath(slug: string, filename: string): string {
  return path.join(corpusEntryDir(slug), filename);
}

export function corpusEntryExists(slug: string): boolean {
  return fs.existsSync(corpusArtifactPath(slug, "ocr.txt"));
}

export const CORPUS_ARTIFACTS = Object.freeze([
  "ocr.txt",
  "normalized.txt",
  "layout.json",
  "segmentation.json",
  "graph.json",
  "purchaseDraft.json",
  "validation.json",
  "golden.json",
  "debugReport.json",
]);

export const CORPUS_OPTIONAL_ARTIFACTS = Object.freeze([
  "receipt.jpg",
  "vision.json",
]);
