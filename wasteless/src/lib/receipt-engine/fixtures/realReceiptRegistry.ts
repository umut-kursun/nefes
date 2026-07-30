import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { BlockDocument } from "../types/models/blocks";
import type { ClassifiedGraph } from "../types/models/classify";
import type { LayoutDocument } from "../types/models/layout";
import type { ReceiptGraph } from "../types/models/graph";
import type { PurchaseDraft } from "../types/models/purchase";
import type { OcrDocument } from "../types/models/image";
import { ocrDocumentFromRaw } from "./ocrFromRaw";

export type RealReceiptMerchantSlug =
  | "migros-ortak-pos"
  | "lcw-clothing"
  | "toyzz-card-slip"
  | "shell-motorin"
  | "opet-benzin"
  | "lezzet-restaurant"
  | "eczane-pharmacy";

export type RealReceiptStage =
  | "layout"
  | "graph"
  | "classified"
  | "blocks"
  | "purchase"
  | "validation";

export interface RealReceiptRef {
  readonly merchant: RealReceiptMerchantSlug;
  readonly name: string;
}

export interface RealReceiptMeta {
  readonly source: string;
  readonly immutable: boolean;
  readonly description: string;
  readonly merchantCategory: string;
  readonly merchantSlug: RealReceiptMerchantSlug;
  readonly ingestedAt: string;
  readonly origin: string;
}

export const REAL_RECEIPT_CATALOG: readonly RealReceiptRef[] = Object.freeze([
  { merchant: "migros-ortak-pos", name: "migros-ortak-pos" },
  { merchant: "lcw-clothing", name: "lcw-clothing" },
  { merchant: "toyzz-card-slip", name: "toyzz-card-slip" },
  { merchant: "shell-motorin", name: "shell-motorin" },
  { merchant: "opet-benzin", name: "opet-benzin" },
  { merchant: "lezzet-restaurant", name: "lezzet-restaurant" },
  { merchant: "eczane-pharmacy", name: "eczane-pharmacy" },
]);

/** SHA256 checksums of immutable raw OCR `.txt` fixtures. */
export const REAL_RECEIPT_OCR_CHECKSUMS: Readonly<
  Record<RealReceiptMerchantSlug, string>
> = Object.freeze({
  "migros-ortak-pos":
    "d2d248f1249814f77eb43b681f4921a5c6cba82291ac15f9b249c9b6e3a37715",
  "lcw-clothing":
    "00726619cc99def745f613178c314bae48b81add3d526b52e348bd2c3db14d15",
  "toyzz-card-slip":
    "f268e1aa4547025ed6cc2fb5a5ea07c66fa67416798d5023c2232a1847b2449e",
  "shell-motorin":
    "ee4a93d48099cdc0fd5ed4a717f9af0a24ebc96a0e113f21785c1c02d9f9636d",
  "opet-benzin":
    "3c2537353469f3e7a50cfdf37b34bb2094c173c877f0c2150e4b103724c95e65",
  "lezzet-restaurant":
    "15aa1cb3ef09d0f7e6a20e541bb9399d4a1bd41dabeb4a619b799c8550475516",
  "eczane-pharmacy":
    "cc00db4d349e75221ecc9b66e23fc0e669ab79fe8a7d6d3c7ed746885d52f706",
});

const REAL_ROOT = path.join(__dirname, "real");

export function realReceiptDir(ref: RealReceiptRef): string {
  return path.join(REAL_ROOT, ref.merchant);
}

export function realReceiptExpectedDir(ref: RealReceiptRef): string {
  return path.join(realReceiptDir(ref), "expected");
}

export function realReceiptOcrPath(ref: RealReceiptRef): string {
  return path.join(realReceiptDir(ref), `${ref.name}.txt`);
}

export function sha256File(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function verifyRealReceiptOcrImmutable(ref: RealReceiptRef): boolean {
  const txtPath = realReceiptOcrPath(ref);
  const actual = sha256File(txtPath);
  const expected = REAL_RECEIPT_OCR_CHECKSUMS[ref.merchant];
  return actual === expected;
}

export function loadRealReceiptMeta(ref: RealReceiptRef): RealReceiptMeta {
  const metaPath = path.join(realReceiptDir(ref), `${ref.name}.meta.json`);
  return JSON.parse(fs.readFileSync(metaPath, "utf8")) as RealReceiptMeta;
}

export function loadRealReceiptOcr(ref: RealReceiptRef): OcrDocument {
  const rawText = fs.readFileSync(realReceiptOcrPath(ref), "utf8");
  return ocrDocumentFromRaw(rawText);
}

export function loadRealReceiptStage<T>(
  ref: RealReceiptRef,
  stage: RealReceiptStage
): T {
  const filePath = path.join(
    realReceiptExpectedDir(ref),
    `${ref.name}.${stage}.json`
  );
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function loadRealReceiptLayout(ref: RealReceiptRef): LayoutDocument {
  return loadRealReceiptStage(ref, "layout");
}

export function loadRealReceiptGraph(ref: RealReceiptRef): ReceiptGraph {
  return loadRealReceiptStage(ref, "graph");
}

export function loadRealReceiptClassified(ref: RealReceiptRef): ClassifiedGraph {
  const graph = loadRealReceiptGraph(ref);
  const golden = loadRealReceiptStage<{
    nodes: ClassifiedGraph["nodes"];
    confidence: number;
  }>(ref, "classified");
  return { graph, nodes: golden.nodes, confidence: golden.confidence };
}

export function loadRealReceiptBlocks(ref: RealReceiptRef): BlockDocument {
  return loadRealReceiptStage(ref, "blocks");
}

export function loadRealReceiptPurchase(ref: RealReceiptRef): PurchaseDraft {
  return loadRealReceiptStage(ref, "purchase");
}

export function loadRealReceiptValidation(
  ref: RealReceiptRef
): Omit<import("../types/models/validation").ValidationReport, "validatedPurchase"> {
  return loadRealReceiptStage(ref, "validation");
}
