import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import type { ReceiptGraph } from "@/lib/receipt-engine/types/models/graph";
import { buildGraphIndex } from "@/lib/receipt-engine/graph/graphIndex";
import { buildChainView } from "@/lib/receipt-engine/graph/chainView";
import { buildRowView } from "@/lib/receipt-engine/graph/rowView";

const GOLDEN_DIR = path.join(
  __dirname,
  "../fixtures/tr-supermarket/expected"
);

function loadGraph(name: string): ReceiptGraph {
  return JSON.parse(
    fs.readFileSync(path.join(GOLDEN_DIR, `${name}.graph.json`), "utf8")
  ) as ReceiptGraph;
}

describe("GraphIndex", () => {
  it("indexes raw lines and regions", () => {
    const index = buildGraphIndex(loadGraph("with-bag"));
    expect(index.rawLineIds().length).toBe(6);
    expect(index.regionOfRaw("raw:L0")).toBe("header");
    expect(index.regionOfRaw("raw:L5")).toBe("footer");
  });

  it("finds continuation chains", () => {
    const index = buildGraphIndex(loadGraph("weighted-continuation"));
    expect(index.chainMembers("raw:L1")).toEqual(["raw:L1", "raw:L2"]);
    expect(index.amountsBoundTo("raw:L2")).toContain("amt:L3");
  });

  it("resolves amount bindings", () => {
    const index = buildGraphIndex(loadGraph("weighted-continuation"));
    expect(index.amountBindingTarget("amt:L3")).toBe("raw:L2");
  });
});

describe("RowView", () => {
  it("collects row node ids and provenance", () => {
    const index = buildGraphIndex(loadGraph("products-only"));
    const row = buildRowView(index, "raw:L1");
    expect(row?.nameFragmentId).toBe("frag:L1:name");
    expect(row?.amountNodeIds).toContain("amt:L1");
    expect(row?.provenance.graphNodeIds.length).toBeGreaterThan(1);
  });
});

describe("ChainView", () => {
  it("spans continuation rows and bound amounts", () => {
    const index = buildGraphIndex(loadGraph("weighted-continuation"));
    const chain = buildChainView(index, "raw:L1");
    expect(chain?.rawLineIds).toEqual(["raw:L1", "raw:L2"]);
    expect(chain?.boundAmountNodeIds).toContain("amt:L3");
    expect(chain?.allNodeIds).toContain("qty:L1");
  });
});
