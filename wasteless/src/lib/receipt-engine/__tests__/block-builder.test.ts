import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import type { ClassifiedGraph } from "@/lib/receipt-engine/types/models/classify";
import type { BlockDocument } from "@/lib/receipt-engine/types/models/blocks";
import type { ReceiptGraph } from "@/lib/receipt-engine/types/models/graph";
import { buildClassifiedGraph } from "@/lib/receipt-engine/layer-4-classify/buildClassifiedGraph";
import { buildBlockDocument } from "@/lib/receipt-engine/layer-5-blocks/buildBlockDocument";
import {
  inspectBlock,
  formatBlockDebug,
} from "@/lib/receipt-engine/layer-5-blocks/blockDebug";

const FIXTURE_DIR = path.join(__dirname, "../fixtures/tr-supermarket");
const GOLDEN_DIR = path.join(FIXTURE_DIR, "expected");

const GOLDEN_FIXTURES = [
  "with-bag",
  "products-only",
  "weighted-continuation",
  "footer-payments",
] as const;

function loadGraph(name: string): ReceiptGraph {
  return JSON.parse(
    fs.readFileSync(path.join(GOLDEN_DIR, `${name}.graph.json`), "utf8")
  ) as ReceiptGraph;
}

function loadClassified(name: string): ClassifiedGraph {
  const graph = loadGraph(name);
  const golden = JSON.parse(
    fs.readFileSync(path.join(GOLDEN_DIR, `${name}.classified.json`), "utf8")
  );
  return { graph, nodes: golden.nodes, confidence: golden.confidence };
}

function blocksFromFixture(name: string): BlockDocument {
  return buildBlockDocument(loadClassified(name));
}

describe("Layer 5 — golden BlockDocument fixtures", () => {
  for (const name of GOLDEN_FIXTURES) {
    it(`matches golden blocks for ${name}`, () => {
      const expected = JSON.parse(
        fs.readFileSync(path.join(GOLDEN_DIR, `${name}.blocks.json`), "utf8")
      ) as BlockDocument;
      const actual = blocksFromFixture(name);
      expect(actual).toEqual(expected);
    });
  }
});

describe("Layer 5 — block builder scenarios", () => {
  it("does not mutate ClassifiedGraph", () => {
    const classified = loadClassified("with-bag");
    const before = JSON.stringify(classified);
    buildBlockDocument(classified);
    expect(JSON.stringify(classified)).toBe(before);
  });

  it("builds charge row into footer charges", () => {
    const doc = blocksFromFixture("with-bag");
    expect(doc.footer.charges.some((c) => c.label.includes("Poseti"))).toBe(
      true
    );
  });

  it("builds weighted continuation product block", () => {
    const doc = blocksFromFixture("weighted-continuation");
    const product = doc.products.find((p) => p.label.includes("Domates"));
    expect(product?.totalPrice).toBe(66.89);
    expect(product?.unitPrice).toBe(89.9);
    expect(product?.quantity).toBe("0,744 kg x 89,90");
  });

  it("builds multiple payment rows", () => {
    const doc = blocksFromFixture("footer-payments");
    expect(doc.footer.payments.length).toBe(2);
  });

  it("builds footer total row", () => {
    const doc = blocksFromFixture("with-bag");
    expect(doc.footer.totals.some((t) => t.label === "TOPLAM")).toBe(true);
  });

  it("assigns each node to at most one primary block", () => {
    const doc = blocksFromFixture("products-only");
    const primary = new Set<string>();
    for (const product of doc.products) {
      for (const ref of product.nodeRefs) {
        expect(primary.has(ref)).toBe(false);
        primary.add(ref);
      }
    }
    for (const ref of doc.footer.nodeRefs) {
      expect(primary.has(ref)).toBe(false);
    }
  });

  it("preserves unknown/header remainder nodes", () => {
    const doc = blocksFromFixture("with-bag");
    expect(doc.unknown.entries.length).toBeGreaterThan(0);
  });

  it("exposes inspectBlock and formatBlockDebug", () => {
    const doc = blocksFromFixture("products-only");
    const product = doc.products[0];
    expect(product).toBeDefined();
    const view = inspectBlock(doc, product!.id);
    expect(view?.block.kind).toBe("product");
    expect(formatBlockDebug(doc)).toContain("BlockDocument");
  });

  it("layer5Blocks produces no LAYER_NOT_IMPLEMENTED issue", async () => {
    const { layer5Blocks, createEngineDependencies, resolveEngineConfig } =
      await import("@/lib/receipt-engine");
    const classified = loadClassified("with-bag");
    const result = await layer5Blocks.run(classified, {
      deps: createEngineDependencies({ config: resolveEngineConfig({}) }),
      config: resolveEngineConfig({}),
    });
    expect(result.issues).toEqual([]);
    expect(result.output.products.length).toBeGreaterThan(0);
  });
});

describe("Layer 5 — discount row (constructed graph)", () => {
  it("routes discount classification to footer discounts", () => {
    const graph = loadGraph("products-only");
    const classified = buildClassifiedGraph(graph);
    const discountNode = classified.nodes.find((n) => n.id === "frag:L1:name");
    if (!discountNode) return;

    const mutatedNodes = classified.nodes.map((n) =>
      n.id === "frag:L1:name"
        ? {
            ...n,
            semanticKind: "discount" as const,
            matchedRules: ["discountClassifier:label"],
            provenance: {
              ...n.provenance,
              classificationRules: ["discountClassifier:label"],
            },
          }
        : n
    );

    const doc = buildBlockDocument({
      ...classified,
      nodes: mutatedNodes,
    });
    expect(doc.footer.discounts.length).toBeGreaterThan(0);
  });
});
