import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import type { LayoutDocument } from "@/lib/receipt-engine/types/models/layout";
import type { ReceiptGraph } from "@/lib/receipt-engine/types/models/graph";
import { buildReceiptGraph } from "@/lib/receipt-engine/layer-3-graph/buildReceiptGraph";
import {
  formatGraphDebug,
  serializeGraphForDebug,
} from "@/lib/receipt-engine/layer-3-graph/graphDebug";
import { passContinuations } from "@/lib/receipt-engine/layer-3-graph/passes/passContinuations";
import { passRawLines } from "@/lib/receipt-engine/layer-3-graph/passes/passRawLines";
import { initGraphState } from "@/lib/receipt-engine/layer-3-graph/graphImmutable";

const FIXTURE_DIR = path.join(__dirname, "../fixtures/tr-supermarket");
const GOLDEN_DIR = path.join(FIXTURE_DIR, "expected");

function loadLayoutGolden(name: string): LayoutDocument {
  return JSON.parse(
    fs.readFileSync(path.join(GOLDEN_DIR, `${name}.layout.json`), "utf8")
  ) as LayoutDocument;
}

function loadGraphGolden(name: string): ReceiptGraph {
  return JSON.parse(
    fs.readFileSync(path.join(GOLDEN_DIR, `${name}.graph.json`), "utf8")
  ) as ReceiptGraph;
}

function graphFromLayout(name: string): ReceiptGraph {
  return buildReceiptGraph(loadLayoutGolden(name));
}

const GOLDEN_FIXTURES = [
  "with-bag",
  "products-only",
  "weighted-continuation",
  "footer-payments",
] as const;

describe("Layer 3 — golden ReceiptGraph fixtures", () => {
  for (const name of GOLDEN_FIXTURES) {
    it(`matches golden graph for ${name}`, () => {
      expect(graphFromLayout(name)).toEqual(loadGraphGolden(name));
    });
  }
});

describe("Layer 3 — graph construction", () => {
  it("creates one raw_line node per layout line", () => {
    const layout = loadLayoutGolden("with-bag");
    const state = passRawLines(initGraphState(layout.profileId, layout.confidence), layout);
    expect(state.nodes).toHaveLength(layout.lines.length);
    expect(state.nodes.every((n) => n.kind === "raw_line")).toBe(true);
  });

  it("links continuation chains with continues edges", () => {
    const layout = loadLayoutGolden("weighted-continuation");
    let state = passRawLines(initGraphState(layout.profileId, layout.confidence), layout);
    state = passContinuations(state, layout);
    const continues = state.edges.filter((e) => e.kind === "continues");
    expect(continues).toEqual([
      expect.objectContaining({
        from: "raw:L1",
        to: "raw:L2",
        kind: "continues",
      }),
    ]);
  });

  it("binds amount-only lines to preceding continuation row", () => {
    const graph = graphFromLayout("weighted-continuation");
    expect(
      graph.edges.some(
        (e) =>
          e.kind === "amount_of" && e.from === "amt:L3" && e.to === "raw:L2"
      )
    ).toBe(true);
  });

  it("preserves provenance on every node", () => {
    const graph = graphFromLayout("with-bag");
    for (const node of graph.nodes) {
      expect(node.provenance.layoutLineIndices.length).toBeGreaterThan(0);
      expect(node.provenance.sourceText).toBeTruthy();
      expect(node.provenance.rawText).toBeTruthy();
      expect(node.provenance.creationRule).toBeTruthy();
      expect(node.provenance.confidence).toBeGreaterThan(0);
    }
  });

  it("never mutates the input graph when adding passes", () => {
    const layout = loadLayoutGolden("products-only");
    const before = buildReceiptGraph(layout);
    const after = buildReceiptGraph(layout);
    expect(before).toEqual(after);
    expect(Object.isFrozen(before.nodes)).toBe(true);
    expect(Object.isFrozen(before.edges)).toBe(true);
  });

  it("exposes debug serialization with regions and provenance", () => {
    const graph = graphFromLayout("footer-payments");
    const debug = serializeGraphForDebug(graph);
    expect(debug.summary.nodeCount).toBeGreaterThan(0);
    expect(debug.summary.regions.footer?.length).toBeGreaterThan(0);
    expect(debug.nodes[0]?.creationRule).toBeTruthy();
    expect(formatGraphDebug(graph)).toContain("ReceiptGraph profile=");
  });

  it("layer3Graph produces no LAYER_NOT_IMPLEMENTED issue", async () => {
    const { layer3Graph, createEngineDependencies, resolveEngineConfig } =
      await import("@/lib/receipt-engine");
    const layout = loadLayoutGolden("with-bag");
    const result = await layer3Graph.run(layout, {
      deps: createEngineDependencies({ config: resolveEngineConfig({}) }),
      config: resolveEngineConfig({}),
    });
    expect(result.issues).toEqual([]);
    expect(result.output.nodes.length).toBeGreaterThan(0);
  });
});

describe("Layer 3 — module constraints", () => {
  it("does not import v1 parser or layer 2 internals", () => {
    const files = fs
      .readdirSync(path.join(__dirname, "../layer-3-graph"), { recursive: true })
      .filter((f) => typeof f === "string" && f.endsWith(".ts"))
      .map((f) => path.join(__dirname, "../layer-3-graph", f as string));

    const forbidden = [
      "receipt-intelligence",
      "receipt-line-parser",
      "receipt-charges",
      "receipt-pipeline",
      "layer-2-layout/patterns",
    ];

    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      for (const term of forbidden) {
        expect(src).not.toContain(term);
      }
    }
  });
});
