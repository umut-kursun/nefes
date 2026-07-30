import { describe, expect, it } from "vitest";
import { emptyPurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import { buildPurchaseDiff } from "../diff/buildPurchaseDiff";
import { generateDiffViewerHtml } from "../diff/generateDiffViewer";

describe("Purchase diff", () => {
  it("detects merchant and product changes", () => {
    const before = emptyPurchaseDraft();
    const after = {
      ...before,
      merchant: "MIGROS",
      products: Object.freeze([
        {
          name: "EKMEK",
          confidence: 0.9,
          provenance: {
            productBlockId: "p1",
            graphNodeIds: [],
            layoutLineIndices: [2],
            rawTexts: ["EKMEK"],
            ocrTexts: ["EKMEK"],
            classificationRules: [],
            confidence: 0.9,
          },
        },
      ]),
    };

    const diff = buildPurchaseDiff("test", before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.summary.merchantChanged).toBe(true);
    expect(diff.summary.productCountDelta).toBe(1);

    const html = generateDiffViewerHtml([diff]);
    expect(html).toContain("MIGROS");
    expect(html).toContain("Receipt Diff Viewer");
  });
});
