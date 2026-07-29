import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import type { ReceiptGraph } from "@/lib/receipt-engine/types/models/graph";
import type { ClassifiedGraph } from "@/lib/receipt-engine/types/models/classify";
import { buildClassifiedGraph } from "@/lib/receipt-engine/layer-4-classify/buildClassifiedGraph";
import {
  inspectClassification,
  formatClassificationDebug,
} from "@/lib/receipt-engine/layer-4-classify/classifyDebug";

const FIXTURE_DIR = path.join(__dirname, "../fixtures/tr-supermarket");
const GOLDEN_DIR = path.join(FIXTURE_DIR, "expected");

const GOLDEN_FIXTURES = [
  "with-bag",
  "products-only",
  "weighted-continuation",
  "footer-payments",
] as const;

function loadGraphGolden(name: string): ReceiptGraph {
  return JSON.parse(
    fs.readFileSync(path.join(GOLDEN_DIR, `${name}.graph.json`), "utf8")
  ) as ReceiptGraph;
}

function loadClassifiedGolden(name: string): Pick<ClassifiedGraph, "nodes" | "confidence"> {
  return JSON.parse(
    fs.readFileSync(path.join(GOLDEN_DIR, `${name}.classified.json`), "utf8")
  ) as Pick<ClassifiedGraph, "nodes" | "confidence">;
}

function classifyFromGraphFixture(name: string): ClassifiedGraph {
  return buildClassifiedGraph(loadGraphGolden(name));
}

describe("Layer 4 — golden ClassifiedGraph fixtures", () => {
  for (const name of GOLDEN_FIXTURES) {
    it(`matches golden classification for ${name}`, () => {
      const graph = loadGraphGolden(name);
      const expected = loadClassifiedGolden(name);
      const actual = buildClassifiedGraph(graph);

      expect(actual.graph).toBe(graph);
      expect(actual.confidence).toBeCloseTo(expected.confidence, 4);
      expect(actual.nodes).toEqual(expected.nodes);
    });
  }
});

describe("Layer 4 — classification integration", () => {
  it("does not mutate ReceiptGraph", () => {
    const graph = loadGraphGolden("with-bag");
    const before = JSON.stringify(graph);
    buildClassifiedGraph(graph);
    expect(JSON.stringify(graph)).toBe(before);
  });

  it("classifies shopping bag line as charge", () => {
    const classified = classifyFromGraphFixture("with-bag");
    const poseti = classified.nodes.find((n) => n.id === "frag:L4:name");
    expect(poseti?.semanticKind).toBe("charge");
  });

  it("classifies footer payments", () => {
    const classified = classifyFromGraphFixture("footer-payments");
    const nakit = classified.nodes.find((n) => n.id === "raw:L2");
    expect(nakit?.semanticKind).toBe("payment");
  });

  it("classifies weighted continuation product row", () => {
    const classified = classifyFromGraphFixture("weighted-continuation");
    const domates = classified.nodes.find((n) => n.id === "frag:L2:name");
    expect(domates?.semanticKind).toBe("product");
  });

  it("exposes inspectClassification helper", () => {
    const classified = classifyFromGraphFixture("products-only");
    const view = inspectClassification(classified, "frag:L1:name");
    expect(view?.semanticKind).toBe("product");
    expect(view?.provenance.rawText).toContain("Peynir");
    expect(formatClassificationDebug(classified)).toContain("ClassifiedGraph");
  });

  it("layer4Classify produces no LAYER_NOT_IMPLEMENTED issue", async () => {
    const { layer4Classify, createEngineDependencies, resolveEngineConfig } =
      await import("@/lib/receipt-engine");
    const graph = loadGraphGolden("with-bag");
    const result = await layer4Classify.run(graph, {
      deps: createEngineDependencies({ config: resolveEngineConfig({}) }),
      config: resolveEngineConfig({}),
    });
    expect(result.issues).toEqual([]);
    expect(result.output.nodes.length).toBeGreaterThan(0);
  });
});
