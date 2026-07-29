/**
 * Regenerate L4 classified + L6 purchase goldens after classification rule changes.
 * Usage: npx tsx src/lib/receipt-engine/scripts/writeClassificationGoldens.ts
 */
import fs from "fs";
import path from "path";
import { buildClassifiedGraph } from "../layer-4-classify/buildClassifiedGraph";
import { buildBlockDocument } from "../layer-5-blocks/buildBlockDocument";
import { buildPurchaseDraft } from "../layer-6-purchase/buildPurchaseDraft";
import {
  FIXTURE_CATALOG,
  fixtureExpectedDir,
  loadFixtureGraph,
} from "../fixtures/fixtureRegistry";

const TR_SUPERMARKET_GOLDEN = path.join(
  __dirname,
  "../fixtures/tr-supermarket/expected"
);

for (const ref of FIXTURE_CATALOG) {
  const graph = loadFixtureGraph(ref);
  const classified = buildClassifiedGraph(graph);
  const outDir = fixtureExpectedDir(ref);
  fs.mkdirSync(outDir, { recursive: true });

  const classifiedPath = path.join(outDir, `${ref.name}.classified.json`);
  fs.writeFileSync(
    classifiedPath,
    `${JSON.stringify(
      { confidence: classified.confidence, nodes: classified.nodes },
      null,
      2
    )}\n`,
    "utf8"
  );
  console.log(`wrote ${classifiedPath}`);

  const blocks = buildBlockDocument(classified);
  const blocksPath = path.join(outDir, `${ref.name}.blocks.json`);
  fs.writeFileSync(blocksPath, `${JSON.stringify(blocks, null, 2)}\n`, "utf8");
  console.log(`wrote ${blocksPath}`);

  const purchase = buildPurchaseDraft(blocks);
  const purchasePath = path.join(outDir, `${ref.name}.purchase.json`);
  fs.writeFileSync(purchasePath, `${JSON.stringify(purchase, null, 2)}\n`, "utf8");
  console.log(`wrote ${purchasePath}`);

  const legacyClassified = path.join(
    TR_SUPERMARKET_GOLDEN,
    `${ref.name}.classified.json`
  );
  if (fs.existsSync(path.dirname(legacyClassified))) {
    fs.writeFileSync(
      legacyClassified,
      `${JSON.stringify(
        { confidence: classified.confidence, nodes: classified.nodes },
        null,
        2
      )}\n`,
      "utf8"
    );
    const legacyBlocks = path.join(TR_SUPERMARKET_GOLDEN, `${ref.name}.blocks.json`);
    fs.writeFileSync(legacyBlocks, `${JSON.stringify(blocks, null, 2)}\n`, "utf8");
    console.log(`wrote ${legacyClassified}`);
    console.log(`wrote ${legacyBlocks}`);
  }
}
