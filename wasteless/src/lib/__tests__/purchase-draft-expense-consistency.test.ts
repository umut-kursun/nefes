import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { purchaseDraftToExpenseDraft } from "@/lib/expense-factory";
import {
  checkReceiptConsistency,
  computeExpectedReceiptTotalFromPurchaseDraft,
} from "@/lib/receipt-quality";
import { emptyPurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import { validateReceiptTotal } from "@/lib/receipt-engine/layer-7-validate/validation/structural/receiptTotalValidator";
import {
  finalizeVisionParsedReceipt,
  parseParsedReceiptJson,
} from "@/lib/receipt-engine-sdk/types/ParsedReceipt";
import { parsedReceiptToPurchaseDraft } from "@/lib/receipt-engine-sdk/adapters/parsedReceiptToPurchaseDraft";

function footerProv(kind: string) {
  return {
    footerBlockId: "footer",
    graphNodeIds: [] as string[],
    semanticKind: kind as "discount" | "total" | "charge",
    confidence: 0.9,
  };
}

describe("purchaseDraftToExpenseDraft receipt total consistency", () => {
  it("expense line sum matches purchase.total for Migros multipliers fixture", async () => {
    const raw = parseParsedReceiptJson(
      JSON.parse(
        readFileSync(join(process.cwd(), "fixtures/vision/migros-multipliers.json"), "utf8")
      )
    );
    const finalized = finalizeVisionParsedReceipt(raw);
    const purchase = await parsedReceiptToPurchaseDraft(finalized);
    const expense = purchaseDraftToExpenseDraft(purchase);

    expect(purchase.total?.amount).toBeCloseTo(817.51, 2);
    expect(validateReceiptTotal(purchase).issues.some((i) => i.code === "TOTAL_MISMATCH")).toBe(
      false
    );

    const consistency = checkReceiptConsistency(
      expense.items,
      expense.totalAmount,
      expense.charges,
      expense.discounts
    );
    expect(consistency.itemsSum).toBeCloseTo(purchase.total!.amount!, 2);
    expect(consistency.inconsistent).toBe(false);
  });

  it("expense line sum matches purchase.total when İNDİRİM misclassified in products[]", () => {
    const purchase: PurchaseDraft = {
      ...emptyPurchaseDraft(),
      merchant: "MIGROS",
      total: {
        label: "TOPLAM",
        amount: 2125.57,
        confidence: 0.9,
        provenance: footerProv("total"),
      },
      products: [
        {
          name: "MARLBORO EDGE SLIMS",
          quantity: 1,
          lineTotal: 172.47,
          confidence: 0.9,
          provenance: {
            productBlockId: "p:1",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["MARLBORO EDGE SLIMS *172,47"],
            ocrTexts: ["MARLBORO EDGE SLIMS *172,47"],
            classificationRules: [],
            confidence: 0.9,
          },
        },
        {
          name: "COLA TURKA 1,5 LT",
          quantity: 1,
          lineTotal: 55,
          confidence: 0.9,
          provenance: {
            productBlockId: "p:2",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["COLA TURKA 1,5 LT *55,00"],
            ocrTexts: ["COLA TURKA 1,5 LT *55,00"],
            classificationRules: [],
            confidence: 0.9,
          },
        },
        {
          name: "% 25 % İNDİRİM %1",
          quantity: 1,
          lineTotal: 57.49,
          confidence: 0.9,
          provenance: {
            productBlockId: "p:3",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["% 25 % İNDİRİM %1 *57,49"],
            ocrTexts: ["% 25 % İNDİRİM %1 *57,49"],
            classificationRules: [],
            confidence: 0.9,
          },
        },
        {
          name: "OTHER GROCERY",
          quantity: 1,
          lineTotal: 1898.1,
          confidence: 0.9,
          provenance: {
            productBlockId: "p:4",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["OTHER GROCERY"],
            ocrTexts: ["OTHER GROCERY"],
            classificationRules: [],
            confidence: 0.9,
          },
        },
      ],
      discounts: [],
      provenance: {
        metadataBlockId: "m:1",
        footerBlockId: "footer",
        blockDocumentConfidence: 0.9,
        rawTexts: [],
      },
      confidence: 0.9,
    };

    // Engine total uses all products including misclassified İNDİRİM line
    expect(computeExpectedReceiptTotalFromPurchaseDraft(purchase)).toBeCloseTo(2183.06, 2);

    const expense = purchaseDraftToExpenseDraft(purchase);
    const consistency = checkReceiptConsistency(
      expense.items,
      expense.totalAmount,
      expense.charges,
      expense.discounts
    );

    // İNDİRİM must not inflate the review UI sum
    expect(expense.items.some((i) => /İNDİRİM/i.test(i.name))).toBe(false);
    expect(consistency.itemsSum).toBeCloseTo(2125.57, 2);
    expect(consistency.inconsistent).toBe(false);
  });

  it("expense line sum matches purchase.total with discounts[] (negative amounts)", () => {
    const purchase: PurchaseDraft = {
      ...emptyPurchaseDraft(),
      merchant: "MIGROS",
      total: {
        label: "TOPLAM",
        amount: 2125.57,
        confidence: 0.9,
        provenance: footerProv("total"),
      },
      products: [
        {
          name: "MARLBORO EDGE SLIMS",
          quantity: 1,
          lineTotal: 229.96,
          confidence: 0.9,
          provenance: {
            productBlockId: "p:1",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["MARLBORO EDGE SLIMS *229,96"],
            ocrTexts: ["MARLBORO EDGE SLIMS *229,96"],
            classificationRules: [],
            confidence: 0.9,
          },
        },
        {
          name: "COLA TURKA 1,5 LT",
          quantity: 1,
          lineTotal: 55,
          confidence: 0.9,
          provenance: {
            productBlockId: "p:2",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["COLA TURKA *55,00"],
            ocrTexts: ["COLA TURKA *55,00"],
            classificationRules: [],
            confidence: 0.9,
          },
        },
        {
          name: "OTHER GROCERY",
          quantity: 1,
          lineTotal: 1898.1,
          confidence: 0.9,
          provenance: {
            productBlockId: "p:3",
            graphNodeIds: [],
            layoutLineIndices: [],
            rawTexts: ["OTHER GROCERY"],
            ocrTexts: ["OTHER GROCERY"],
            classificationRules: [],
            confidence: 0.9,
          },
        },
      ],
      discounts: [
        {
          label: "% 25 % İNDİRİM (MARLBORO EDGE SLIMS)",
          amount: -57.49,
          confidence: 0.9,
          provenance: footerProv("discount"),
        },
      ],
      provenance: {
        metadataBlockId: "m:1",
        footerBlockId: "footer",
        blockDocumentConfidence: 0.9,
        rawTexts: [],
      },
      confidence: 0.9,
    };

    expect(validateReceiptTotal(purchase).issues.some((i) => i.code === "TOTAL_MISMATCH")).toBe(
      false
    );

    const expense = purchaseDraftToExpenseDraft(purchase);
    const consistency = checkReceiptConsistency(
      expense.items,
      expense.totalAmount,
      expense.charges,
      expense.discounts
    );

    expect(consistency.itemsSum).toBeCloseTo(2125.57, 2);
    expect(consistency.inconsistent).toBe(false);
  });
});
