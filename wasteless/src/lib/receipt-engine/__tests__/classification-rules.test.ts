import { describe, expect, it } from "vitest";
import type { GraphNode, ReceiptGraph } from "@/lib/receipt-engine/types/models/graph";
import { GraphContext } from "@/lib/receipt-engine/layer-4-classify/graphContext";
import { headerClassifier } from "@/lib/receipt-engine/layer-4-classify/rules/headerClassifier";
import { footerClassifier } from "@/lib/receipt-engine/layer-4-classify/rules/footerClassifier";
import { paymentClassifier } from "@/lib/receipt-engine/layer-4-classify/rules/paymentClassifier";
import { vatClassifier } from "@/lib/receipt-engine/layer-4-classify/rules/vatClassifier";
import { discountClassifier } from "@/lib/receipt-engine/layer-4-classify/rules/discountClassifier";
import { chargeClassifier } from "@/lib/receipt-engine/layer-4-classify/rules/chargeClassifier";
import { amountClassifier } from "@/lib/receipt-engine/layer-4-classify/rules/amountClassifier";
import { productCandidateClassifier } from "@/lib/receipt-engine/layer-4-classify/rules/productCandidateClassifier";
import { metadataClassifier } from "@/lib/receipt-engine/layer-4-classify/rules/metadataClassifier";
import { resolveConflict, SEMANTIC_PRIORITY } from "@/lib/receipt-engine/layer-4-classify/conflictResolver";

function graphNode(
  id: string,
  kind: GraphNode["kind"],
  text: string,
  lineIndex: number
): GraphNode {
  return {
    id,
    kind,
    text,
    amount: null,
    layoutRef: { lineIndex },
    provenance: {
      layoutLineIndices: [lineIndex],
      sourceText: text,
      rawText: text,
      creationRule: "test",
      confidence: 0.85,
    },
    confidence: 0.85,
  };
}

function miniGraph(
  nodes: GraphNode[],
  edges: ReceiptGraph["edges"] = [],
  regions: ReceiptGraph["regions"] = {}
): ReceiptGraph {
  return { nodes, edges, regions, profileId: "generic-tr", confidence: 0.85 };
}

describe("ConflictResolver", () => {
  it("prefers higher semantic priority", () => {
    const result = resolveConflict([
      { semanticKind: "footer", confidence: 0.9, ruleId: "a", reason: "a" },
      { semanticKind: "total", confidence: 0.7, ruleId: "b", reason: "b" },
    ]);
    expect(result.winner.semanticKind).toBe("total");
    expect(result.alternatives[0]?.semanticKind).toBe("footer");
  });

  it("breaks ties by confidence then ruleId", () => {
    const result = resolveConflict([
      { semanticKind: "product", confidence: 0.65, ruleId: "b", reason: "b" },
      { semanticKind: "product", confidence: 0.85, ruleId: "a", reason: "a" },
    ]);
    expect(result.winner.ruleId).toBe("a");
  });

  it("returns fallback when no candidates", () => {
    const result = resolveConflict([]);
    expect(result.winner.semanticKind).toBe("unknown");
  });

  it("defines priority for every semantic kind", () => {
    const kinds = [
      "unknown", "product", "charge", "discount", "payment", "total",
      "subtotal", "vat", "merchant", "address", "date", "time", "receipt_number",
      "loyalty", "barcode", "separator", "header", "footer", "card_slip", "other",
    ] as const;
    for (const kind of kinds) {
      expect(SEMANTIC_PRIORITY[kind]).toBeTypeOf("number");
    }
  });
});

describe("HeaderClassifier", () => {
  it("classifies header raw lines", () => {
    const node = graphNode("raw:L0", "raw_line", "MIGROS A.S.", 0);
    const graph = miniGraph([node], [], { header: ["raw:L0"] });
    const hits = headerClassifier(node, new GraphContext(graph));
    expect(hits[0]?.semanticKind).toBe("header");
  });

  it("classifies first header fragment as merchant", () => {
    const raw = graphNode("raw:L0", "raw_line", "MIGROS A.S.", 0);
    const frag = graphNode("frag:L0:name", "text_fragment", "MIGROS A.S.", 0);
    const graph = miniGraph(
      [raw, frag],
      [{ id: "e1", from: "frag:L0:name", to: "raw:L0", kind: "same_row", confidence: 0.65 }],
      { header: ["raw:L0"] }
    );
    const hits = headerClassifier(frag, new GraphContext(graph));
    expect(hits.some((h) => h.semanticKind === "merchant")).toBe(true);
  });
});

describe("FooterClassifier", () => {
  it("classifies footer labels", () => {
    const raw = graphNode("raw:L5", "raw_line", "TOPLAM 61,40", 5);
    const label = graphNode("frag:L5:name", "label", "TOPLAM", 5);
    const graph = miniGraph(
      [raw, label],
      [{ id: "e1", from: "frag:L5:name", to: "raw:L5", kind: "same_row", confidence: 0.85 }],
      { footer: ["raw:L5"] }
    );
    const hits = footerClassifier(label, new GraphContext(graph));
    expect(hits[0]?.semanticKind).toBe("footer");
  });
});

describe("PaymentClassifier", () => {
  it("detects nakit payment lines", () => {
    const node = graphNode("frag:L2:name", "label", "Nakit 50,00", 2);
    const hits = paymentClassifier(node, new GraphContext(miniGraph([node])));
    expect(hits[0]?.semanticKind).toBe("payment");
  });

  it("detects ortak pos payment lines", () => {
    const node = graphNode("frag:L4:name", "label", "ORTAK POS 60,90", 4);
    const hits = paymentClassifier(node, new GraphContext(miniGraph([node])));
    expect(hits[0]?.semanticKind).toBe("payment");
  });
});

describe("VatClassifier", () => {
  it("classifies vat_token nodes", () => {
    const node = graphNode("vat:L2", "vat_token", "%1", 2);
    const hits = vatClassifier(node, new GraphContext(miniGraph([node])));
    expect(hits[0]?.semanticKind).toBe("vat");
  });
});

describe("DiscountClassifier", () => {
  it("detects indirim labels", () => {
    const node = graphNode("frag:L1:name", "label", "Indirim 5,00", 1);
    const hits = discountClassifier(node, new GraphContext(miniGraph([node])));
    expect(hits[0]?.semanticKind).toBe("discount");
  });
});

describe("ChargeClassifier", () => {
  it("detects poset charges", () => {
    const node = graphNode("frag:L4:name", "text_fragment", "Alisveris Poseti", 4);
    const hits = chargeClassifier(node, new GraphContext(miniGraph([node])));
    expect(hits[0]?.semanticKind).toBe("charge");
  });
});

describe("AmountClassifier", () => {
  it("classifies total amounts via label", () => {
    const raw = graphNode("raw:L5", "raw_line", "TOPLAM 61,40", 5);
    const label = graphNode("frag:L5:name", "label", "TOPLAM", 5);
    const amount = graphNode("amt:L5", "amount", "61,40", 5);
    amount.amount = 61.4;
    const graph = miniGraph(
      [raw, label, amount],
      [
        { id: "e1", from: "frag:L5:name", to: "raw:L5", kind: "same_row", confidence: 0.85 },
        { id: "e2", from: "amt:L5", to: "raw:L5", kind: "same_row", confidence: 0.85 },
        { id: "e3", from: "amt:L5", to: "raw:L5", kind: "amount_of", confidence: 0.85 },
      ],
      { footer: ["raw:L5"] }
    );
    const hits = amountClassifier(amount, new GraphContext(graph));
    expect(hits[0]?.semanticKind).toBe("total");
  });

  it("classifies payment row amounts as payment in body region", () => {
    const raw = graphNode("raw:L4", "raw_line", "ORTAK POS 60,90", 4);
    const label = graphNode("frag:L4:name", "label", "ORTAK POS", 4);
    const amount = graphNode("amt:L4", "amount", "60,90", 4);
    amount.amount = 60.9;
    const graph = miniGraph(
      [raw, label, amount],
      [
        { id: "e1", from: "frag:L4:name", to: "raw:L4", kind: "same_row", confidence: 0.85 },
        { id: "e2", from: "amt:L4", to: "raw:L4", kind: "same_row", confidence: 0.85 },
        { id: "e3", from: "amt:L4", to: "raw:L4", kind: "amount_of", confidence: 0.85 },
      ],
      { body: ["raw:L4"] }
    );
    const hits = amountClassifier(amount, new GraphContext(graph));
    expect(hits[0]?.semanticKind).toBe("payment");
  });
});

describe("ProductCandidateClassifier", () => {
  it("classifies body name fragments with amounts", () => {
    const raw = graphNode("raw:L2", "raw_line", "Sut 1 L %1 45,90", 2);
    const frag = graphNode("frag:L2:name", "text_fragment", "Sut 1 L", 2);
    const amount = graphNode("amt:L2", "amount", "45,90", 2);
    const graph = miniGraph(
      [raw, frag, amount],
      [
        { id: "e1", from: "frag:L2:name", to: "raw:L2", kind: "same_row", confidence: 0.85 },
        { id: "e2", from: "amt:L2", to: "raw:L2", kind: "same_row", confidence: 0.85 },
      ],
      { body: ["raw:L2"] }
    );
    const hits = productCandidateClassifier(frag, new GraphContext(graph));
    expect(hits[0]?.semanticKind).toBe("product");
  });
});

describe("MetadataClassifier", () => {
  it("detects barcode noise", () => {
    const node = graphNode("noise:L9", "noise", "123456789012", 9);
    const hits = metadataClassifier(node, new GraphContext(miniGraph([node])));
    expect(hits.some((h) => h.semanticKind === "barcode")).toBe(true);
  });

  it("detects separator noise", () => {
    const node = graphNode("noise:L9", "noise", "****", 9);
    const hits = metadataClassifier(node, new GraphContext(miniGraph([node])));
    expect(hits.some((h) => h.semanticKind === "separator")).toBe(true);
  });

  it("detects total labels on label nodes", () => {
    const node = graphNode("frag:L5:name", "label", "TOPLAM", 5);
    const hits = metadataClassifier(node, new GraphContext(miniGraph([node])));
    expect(hits.some((h) => h.semanticKind === "total")).toBe(true);
  });
});
