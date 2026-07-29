import type { PurchaseDraft } from "./purchase";

export interface KnowledgeMatchStats {
  matched: number;
  unknown: number;
  aiNormalized: number;
}

/** Layer 8 output — purchase draft plus canonical enrichment metadata. */
export interface EnrichedPurchase extends PurchaseDraft {
  knowledgeNotes: string[];
  matchStats: KnowledgeMatchStats;
}

export function emptyEnrichedPurchase(): EnrichedPurchase {
  return {
    ...emptyPurchaseDraftSpread(),
    knowledgeNotes: [],
    matchStats: { matched: 0, unknown: 0, aiNormalized: 0 },
  };
}

function emptyPurchaseDraftSpread(): PurchaseDraft {
  return {
    merchant: null,
    purchaseDate: null,
    purchaseTime: null,
    receiptNumber: null,
    currency: null,
    products: [],
    charges: [],
    discounts: [],
    payments: [],
    vatSummary: [],
    subtotal: null,
    total: null,
    confidence: 0,
    provenance: {
      metadataBlockId: "metadata:empty",
      footerBlockId: "footer:empty",
      blockDocumentConfidence: 0,
      rawTexts: [],
    },
  };
}
