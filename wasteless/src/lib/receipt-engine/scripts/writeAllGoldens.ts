/**
 * Regenerate layout + graph + downstream goldens after pipeline architecture changes.
 * Usage: npx tsx src/lib/receipt-engine/scripts/writeAllGoldens.ts
 */
import fs from "fs";
import path from "path";
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

const LEGACY = path.join(__dirname, "../fixtures/tr-supermarket/expected");

for (const ref of FIXTURE_CATALOG) {
  const ocr = loadFixtureOcr(ref);
  const layout = reconstructLayout(ocr, "generic-tr");
  const graph = buildReceiptGraph(layout);
  const classified = buildClassifiedGraph(graph);
  const blocks = buildBlockDocument(classified);
  const purchase = buildPurchaseDraft(blocks);
  const validation = buildValidationReport(purchase);

  const outDir = fixtureExpectedDir(ref);
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

  if (fs.existsSync(LEGACY)) {
    for (const suffix of [
      "layout",
      "graph",
      "classified",
      "blocks",
      "purchase",
    ] as const) {
      const src = path.join(outDir, `${ref.name}.${suffix}.json`);
      const dest = path.join(LEGACY, `${ref.name}.${suffix}.json`);
      fs.copyFileSync(src, dest);
      console.log(`copied ${dest}`);
    }
  }
}
