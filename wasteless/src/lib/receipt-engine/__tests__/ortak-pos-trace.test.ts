import { describe, expect, it } from "vitest";
import { ocrDocumentFromRaw } from "@/lib/receipt-engine/fixtures/ocrFromRaw";
import { reconstructLayout } from "@/lib/receipt-engine/layer-2-layout/layoutReconstructor";
import { buildReceiptGraph } from "@/lib/receipt-engine/layer-3-graph/buildReceiptGraph";
import { buildClassifiedGraph } from "@/lib/receipt-engine/layer-4-classify/buildClassifiedGraph";
import { buildBlockDocument } from "@/lib/receipt-engine/layer-5-blocks/buildBlockDocument";
import { buildPurchaseDraft } from "@/lib/receipt-engine/layer-6-purchase/buildPurchaseDraft";

/** ORTAK POS commonly appears above TOPLAM on Turkish receipts. */
const ORTAK_POS_RECEIPT = `MIGROS TICARET A.S.
29.07.2026 16:00
EKMEK 750 GR %1 15,00
SUT 1 LT %1 45,90
ORTAK POS 60,90
TOPLAM 60,90`;

function runPipeline(raw: string) {
  const ocr = ocrDocumentFromRaw(raw);
  const layout = reconstructLayout(ocr, "generic-tr");
  const graph = buildReceiptGraph(layout);
  const classified = buildClassifiedGraph(graph);
  const blocks = buildBlockDocument(classified);
  const purchase = buildPurchaseDraft(blocks);
  return { layout, classified, purchase };
}

describe("ORTAK POS receipt trace", () => {
  it("classifies ORTAK POS as payment, not product", () => {
    const { layout, classified, purchase } = runPipeline(ORTAK_POS_RECEIPT);

    const ortakLine = layout.lines.find((l) => /ORTAK POS/i.test(l.text));
    expect(ortakLine).toBeDefined();

    const ortakRawId = `raw:L${ortakLine!.index}`;
    const ortakNode = classified.nodes.find((n) => n.id === ortakRawId);
    expect(ortakNode?.semanticKind).toBe("payment");

    expect(purchase.products.map((p) => p.name)).toEqual([
      "EKMEK 750 GR",
      "SUT 1 LT",
    ]);
    expect(purchase.payments.some((p) => /ORTAK POS/i.test(p.label))).toBe(true);
    expect(purchase.products.some((p) => /ORTAK POS/i.test(p.name))).toBe(false);
  });
});
