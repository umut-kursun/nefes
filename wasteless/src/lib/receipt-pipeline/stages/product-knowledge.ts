import type { AnalysisItem } from "@/lib/types";

import type { CatalogSnapshot } from "@/lib/product-knowledge/catalogSnapshot";

import { canonicalAsOverlay } from "@/lib/product-knowledge/catalogSnapshot";

import type { ProductAliasEntry } from "@/lib/product-knowledge/types";

import { matchProduct } from "@/lib/product-knowledge/productMatcher";

import { normalizeOcrText } from "@/lib/product-knowledge/productNormalizer";

import { isReceiptChargeLine } from "@/lib/receipt-charges";



export type ProductKnowledgeOptions = {

  /** Step 5 — AI normalization for unresolved lines (runs only after steps 1–4 fail). */

  aiNormalize?: (ocrText: string) => Promise<string | null>;

  /** Logged when KV catalog unavailable and seed fallback is active. */

  catalogFallbackNote?: string;

};



export type ProductKnowledgeResult = {

  items: AnalysisItem[];

  notes: string[];

  matchedCount: number;

  unknownCount: number;

};



function sourceLabel(source: string): string {

  switch (source) {

    case "personal_alias":

      return "personal";

    case "global_alias":

      return "global-alias";

    case "exact":

      return "exact";

    case "fuzzy":

      return "fuzzy";

    case "ai_normalize":

      return "ai";

    default:

      return source;

  }

}



/**

 * Stage — Product Knowledge Base matching (deterministic precedence):

 * 1. Personal user aliases (productAliases from client)

 * 2. Global aliases from canonical KB

 * 3. Exact canonical product match

 * 4. Fuzzy match on searchKeys

 * 5. AI normalization + retry steps 1–4 (only if still unresolved)

 * 6. Unknown product

 */

export async function applyProductKnowledge(

  items: AnalysisItem[],

  learnedAliases: ProductAliasEntry[] = [],

  catalogSnapshot?: CatalogSnapshot | null,

  options?: ProductKnowledgeOptions

): Promise<ProductKnowledgeResult> {

  const notes: string[] = [];

  let matchedCount = 0;

  let unknownCount = 0;



  if (options?.catalogFallbackNote) {

    notes.push(`[catalog] KV unavailable — using bundled seed catalog (${options.catalogFallbackNote})`);

  }



  const globalOverlay = catalogSnapshot

    ? canonicalAsOverlay(catalogSnapshot)

    : undefined;

  const loadOptions = catalogSnapshot

    ? { canonicalFull: true as const, catalogVersion: catalogSnapshot.version }

    : undefined;



  const next: AnalysisItem[] = [];



  for (const item of items) {

    const ocrName = (item.ocrName ?? item.name)?.trim() ?? "";

    if (!ocrName) {

      next.push(item);

      continue;

    }



    if (isReceiptChargeLine(ocrName)) {

      next.push(item);

      continue;

    }



    let result = matchProduct(

      ocrName,

      learnedAliases,

      globalOverlay,

      loadOptions

    );



    // Step 5 — AI normalization only when steps 1–4 did not resolve

    if (!result.productId && options?.aiNormalize) {

      const aiText = await options.aiNormalize(ocrName);

      if (aiText) {

        const retried = matchProduct(

          aiText,

          learnedAliases,

          globalOverlay,

          loadOptions

        );

        if (retried.productId && retried.canonicalName) {

          result = { ...retried, source: "ai_normalize" };

          notes.push(`[ai] "${ocrName}" → "${aiText}" → "${retried.canonicalName}"`);

        }

      }

    }



    if (result.productId && result.canonicalName) {

      matchedCount += 1;

      notes.push(

        `[${sourceLabel(result.source)}] "${ocrName}" → "${result.canonicalName}" (${Math.round(result.confidence * 100)}%)`

      );

      next.push({

        ...item,

        ocrName,

        name: result.canonicalName,

        confidence: Math.max(item.confidence ?? 0, result.confidence),

      });

      continue;

    }



    unknownCount += 1;

    const normalized = normalizeOcrText(ocrName);

    const display =

      normalized && normalized !== ocrName.toUpperCase()

        ? normalized

            .toLocaleLowerCase("tr-TR")

            .replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase("tr-TR"))

        : ocrName;



    next.push({

      ...item,

      ocrName,

      name: display,

      confidence: Math.min(item.confidence ?? 0.5, 0.55),

    });

  }



  return { items: next, notes, matchedCount, unknownCount };

}

