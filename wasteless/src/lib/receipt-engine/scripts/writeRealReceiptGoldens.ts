/**
 * Regenerate expected/*.json goldens for REAL_RECEIPT_CATALOG only.
 * Usage: npx tsx src/lib/receipt-engine/scripts/writeRealReceiptGoldens.ts
 */
import fs from "fs";
import path from "path";
import {
  REAL_RECEIPT_CATALOG,
  realReceiptExpectedDir,
  loadRealReceiptOcr,
} from "../fixtures/realReceiptRegistry";
import { reconstructLayout } from "../layer-2-layout/layoutReconstructor";
import { buildReceiptGraph } from "../layer-3-graph/buildReceiptGraph";
import { buildClassifiedGraph } from "../layer-4-classify/buildClassifiedGraph";
import { buildBlockDocument } from "../layer-5-blocks/buildBlockDocument";
import { buildPurchaseDraft } from "../layer-6-purchase/buildPurchaseDraft";
import { buildValidationReport } from "../layer-7-validate/buildValidationReport";

for (const ref of REAL_RECEIPT_CATALOG) {
  const ocr = loadRealReceiptOcr(ref);
  const layout = reconstructLayout(ocr, "generic-tr");
  const graph = buildReceiptGraph(layout);
  const classified = buildClassifiedGraph(graph);
  const blocks = buildBlockDocument(classified);
  const purchase = buildPurchaseDraft(blocks);
  const validation = buildValidationReport(purchase);

  const outDir = realReceiptExpectedDir(ref);
  fs.mkdirSync(outDir, { recursive: true });

  const write = (filename: string, data: unknown) => {
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log(`wrote ${filePath}`);
  };

  write(`${ref.name}.layout.json`, layout);
  write(`${ref.name}.graph.json`, graph);
  write(`${ref.name}.classified.json`, {
    confidence: classified.confidence,
    nodes: classified.nodes,
  });
  write(`${ref.name}.blocks.json`, blocks);
  write(`${ref.name}.purchase.json`, purchase);
  const { validatedPurchase, ...validationGolden } = validation;
  void validatedPurchase;
  write(`${ref.name}.validation.json`, validationGolden);
}
