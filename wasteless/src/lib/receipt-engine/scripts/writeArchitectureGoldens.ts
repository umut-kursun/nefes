/**
 * Regenerate layout → graph → classified → blocks → purchase goldens
 * from OCR fixtures after parser architecture changes.
 *
 * Usage: npx tsx src/lib/receipt-engine/scripts/writeArchitectureGoldens.ts
 */
import fs from "fs";
import path from "path";
import { ocrDocumentFromRaw } from "../fixtures/ocrFromRaw";
import {
  FIXTURE_CATALOG,
  fixtureExpectedDir,
  loadFixtureOcr,
} from "../fixtures/fixtureRegistry";
import { reconstructLayout } from "../layer-2-layout/layoutReconstructor";
import { buildReceiptGraph } from "../layer-3-graph/buildReceiptGraph";
import { buildClassifiedGraph } from "../layer-4-classify/buildClassifiedGraph";
import { buildBlockDocument } from "../layer-5-blocks/buildBlockDocument";
import { buildPurchaseDraft } from "../layer-6-purchase/buildPurchaseDraft";
import { buildValidationReport } from "../layer-7-validate/buildValidationReport";
import { stripValidatedPurchase } from "../layer-7-validate/stripValidatedPurchase";

const LEGACY_DIR = path.join(__dirname, "../fixtures/tr-supermarket/expected");

for (const ref of FIXTURE_CATALOG) {
  const ocr = loadFixtureOcr(ref);
  const layout = reconstructLayout(ocr, "generic-tr");
  const graph = buildReceiptGraph(layout);
  const classified = buildClassifiedGraph(graph);
  const blocks = buildBlockDocument(classified);
  const purchase = buildPurchaseDraft(blocks);
  const validation = stripValidatedPurchase(buildValidationReport(purchase));

  const outDir = fixtureExpectedDir(ref);
  fs.mkdirSync(outDir, { recursive: true });

  const write = (name: string, data: unknown) => {
    const p = path.join(outDir, `${ref.name}.${name}.json`);
    fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log(`wrote ${p}`);
  };

  write("layout", layout);
  write("graph", graph);
  write("classified", {
    confidence: classified.confidence,
    nodes: classified.nodes,
  });
  write("blocks", blocks);
  write("purchase", purchase);
  write("validation", validation);

  // Mirror into legacy tr-supermarket expected when applicable.
  if (ref.category === "supermarket" || ref.category === "weighted" || ref.category === "multi-payment") {
    fs.mkdirSync(LEGACY_DIR, { recursive: true });
    for (const stage of [
      "layout",
      "graph",
      "classified",
      "blocks",
      "purchase",
      "validation",
    ] as const) {
      const src = path.join(outDir, `${ref.name}.${stage}.json`);
      if (!fs.existsSync(src)) continue;
      const dest = path.join(LEGACY_DIR, `${ref.name}.${stage}.json`);
      fs.copyFileSync(src, dest);
      console.log(`mirrored ${dest}`);
    }
  }
}

void ocrDocumentFromRaw;
