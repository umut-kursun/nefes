import { describe, expect, it } from "vitest";
import type {
  BlockDocument,
  FooterBlock,
  FooterLineEntry,
  ProductBlock,
} from "@/lib/receipt-engine/types/models/blocks";
import { emptyBlockDocument } from "@/lib/receipt-engine/types/models/blocks";
import { buildPurchaseDraft } from "@/lib/receipt-engine/layer-6-purchase/buildPurchaseDraft";
import {
  inspectPurchase,
  formatPurchaseDebug,
  purchaseDraftToJson,
} from "@/lib/receipt-engine/layer-6-purchase/purchaseDebug";
import { buildBlockDocument } from "@/lib/receipt-engine/layer-5-blocks/buildBlockDocument";
import {
  loadFixtureClassified,
  resolveLegacyFixture,
} from "@/lib/receipt-engine/fixtures/fixtureRegistry";

function purchaseFromLegacy(name: string) {
  const classified = loadFixtureClassified(resolveLegacyFixture(name));
  return buildPurchaseDraft(buildBlockDocument(classified));
}

describe("Layer 6 — product mapping", () => {
  it("maps weighted product with quantity and unit", () => {
    const draft = purchaseFromLegacy("weighted-continuation");
    const line = draft.products[0];
    expect(line?.quantity).toBe(0.744);
    expect(line?.unit).toBe("kg");
    expect(line?.unitPrice).toBe(89.9);
    expect(line?.lineTotal).toBe(66.89);
    expect(line?.provenance.ocrTexts.length).toBeGreaterThan(1);
  });

  it("maps quantity unit from token when block unit is null", () => {
    const draft = purchaseFromLegacy("with-bag");
    const milk = draft.products.find((p) => p.name.includes("Sut"));
    expect(milk?.quantity).toBe(1);
    expect(milk?.unit).toBe("L");
    expect(milk?.vatRate).toBe(1);
  });

  it("leaves missing quantity undefined", () => {
    const draft = purchaseFromLegacy("with-bag");
    const line = draft.products.find((p) => p.name === "Ekmek");
    expect(line?.quantity).toBeUndefined();
    expect(line?.lineTotal).toBe(15);
  });

  it("leaves missing VAT undefined", () => {
    const draft = purchaseFromLegacy("weighted-continuation");
    expect(draft.products[0]?.vatRate).toBeUndefined();
  });
});

describe("Layer 6 — footer mapping", () => {
  it("maps multiple payments deterministically", () => {
    const draft = purchaseFromLegacy("footer-payments");
    expect(draft.payments).toHaveLength(2);
    expect(draft.total?.amount).toBe(8.9);
  });

  it("maps charge row from with-bag footer", () => {
    const draft = purchaseFromLegacy("with-bag");
    expect(draft.charges.some((c) => c.label.includes("Poseti"))).toBe(true);
  });

  it("maps discount from constructed footer block", () => {
    const base = emptyBlockDocument();
    const entry: FooterLineEntry = {
      label: "Indirim",
      amount: -5,
      nodeRefs: ["amt:L9"],
      semanticKind: "discount",
      confidence: 0.7,
    };
    const footer: FooterBlock = {
      ...base.footer,
      discounts: [entry],
    };
    const doc: BlockDocument = { ...base, footer };
    const draft = buildPurchaseDraft(doc);
    expect(draft.discounts).toHaveLength(1);
    expect(draft.discounts[0]?.amount).toBe(-5);
  });

  it("maps VAT summary rows", () => {
    const base = emptyBlockDocument();
    const entry: FooterLineEntry = {
      label: "KDV %1",
      amount: 1.2,
      nodeRefs: ["amt:L8"],
      semanticKind: "vat_summary",
      confidence: 0.7,
    };
    const footer: FooterBlock = {
      ...base.footer,
      vatSummaries: [entry],
    };
    const draft = buildPurchaseDraft({ ...base, footer });
    expect(draft.vatSummary).toHaveLength(1);
    expect(draft.vatSummary[0]?.label).toBe("KDV %1");
  });
});

describe("Layer 6 — metadata", () => {
  it("passes merchant without inference", () => {
    const draft = purchaseFromLegacy("footer-payments");
    expect(draft.merchant).toBe("A101");
    expect(draft.currency).toBeNull();
  });

  it("leaves missing metadata null", () => {
    const draft = purchaseFromLegacy("products-only");
    expect(draft.purchaseDate).toBeNull();
    expect(draft.receiptNumber).toBeNull();
  });
});

describe("Layer 6 — provenance and debug", () => {
  it("preserves product provenance chain", () => {
    const draft = purchaseFromLegacy("with-bag");
    const view = inspectPurchase(draft, 0);
    expect(view?.productBlockId).toMatch(/^product:/);
    expect(view?.graphNodeCount).toBeGreaterThan(0);
    expect(view?.ocrTexts.length).toBeGreaterThan(0);
  });

  it("exposes debug helpers", () => {
    const draft = purchaseFromLegacy("products-only");
    expect(formatPurchaseDebug(draft)).toContain("PurchaseDraft");
    expect(JSON.parse(purchaseDraftToJson(draft)).products.length).toBeGreaterThan(
      0
    );
  });

  it("maps wrapped continuation label without fabricating name", () => {
    const draft = purchaseFromLegacy("weighted-continuation");
    expect(draft.products[0]?.name).toContain("Domates");
  });
});

describe("Layer 6 — unknown unit", () => {
  it("keeps unknown unit as raw-only via quantity token", () => {
    const base = emptyBlockDocument();
    const product: ProductBlock = {
      id: "product:test",
      kind: "product",
      label: "Mystery item",
      quantity: "2 box",
      unit: null,
      unitPrice: null,
      totalPrice: 10,
      vatToken: null,
      chainRawLineIds: ["raw:L1"],
      rawLines: ["Mystery item 2 box 10,00"],
      groupIds: ["raw:L1"],
      nodeRefs: ["raw:L1"],
      provenance: {
        graphNodeIds: ["raw:L1"],
        layoutLineIndices: [1],
        rawTexts: ["Mystery item 2 box 10,00"],
        classificationRules: [],
        confidence: 0.5,
      },
      confidence: 0.5,
    };
    const draft = buildPurchaseDraft({ ...base, products: [product] });
    expect(draft.products[0]?.quantity).toBe(2);
    expect(draft.products[0]?.unit).toBeUndefined();
  });
});

describe("Layer 6 — layer wiring", () => {
  it("layer6Purchase produces no LAYER_NOT_IMPLEMENTED issue", async () => {
    const { layer6Purchase, createEngineDependencies, resolveEngineConfig } =
      await import("@/lib/receipt-engine");
    const blocks = buildBlockDocument(
      loadFixtureClassified(resolveLegacyFixture("with-bag"))
    );
    const result = await layer6Purchase.run(
      { blocks },
      {
        deps: createEngineDependencies({ config: resolveEngineConfig({}) }),
        config: resolveEngineConfig({}),
      }
    );
    expect(result.issues).toEqual([]);
    expect(result.output.products.length).toBeGreaterThan(0);
  });
});
