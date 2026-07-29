import type { ClassifiedGraph, ClassifiedNode, SemanticKind } from "../types/models/classify";
import type { GraphIndex } from "../graph/graphIndex";
import type { ChainView } from "../graph/chainView";
import type { ProductBlock } from "../types/models/blocks";
import { averageConfidence, provenanceFromNodes } from "./blockProvenance";
import { extractSoldUnitPrice } from "../layer-6-purchase/parsers/purchasedQuantity";

const PRODUCT_KINDS = new Set<SemanticKind>(["product"]);

function isProductChain(
  chain: ChainView,
  classified: Map<string, ClassifiedNode>
): boolean {
  const hasChargeOrDiscount = chain.allNodeIds.some((id) => {
    const kind = classified.get(id)?.semanticKind;
    return kind === "charge" || kind === "discount";
  });
  if (hasChargeOrDiscount) return false;

  return chain.allNodeIds.some((id) =>
    PRODUCT_KINDS.has(classified.get(id)?.semanticKind ?? "unknown")
  );
}

function pickLineTotal(
  index: GraphIndex,
  chain: ChainView,
  classified: Map<string, ClassifiedNode>
): { amount: number | null; nodeId: string | null } {
  for (const row of [...chain.rows].reverse()) {
    for (const amountId of row.boundAmountNodeIds) {
      const cn = classified.get(amountId);
      const nodeAmount = cn?.amount ?? index.node(amountId)?.amount ?? null;
      if (nodeAmount != null) {
        return { amount: nodeAmount, nodeId: amountId };
      }
    }
  }

  for (const amountId of chain.boundAmountNodeIds) {
    const cn = classified.get(amountId);
    const nodeAmount = cn?.amount ?? index.node(amountId)?.amount ?? null;
    if (nodeAmount != null) {
      return { amount: nodeAmount, nodeId: amountId };
    }
  }

  for (let i = chain.rows.length - 1; i >= 0; i--) {
    const row = chain.rows[i]!;
    const hasUnitPrice = row.tokenNodeIds.some(
      (tid) => index.node(tid)?.kind === "unit_price_token"
    );
    if (hasUnitPrice) continue;

    for (const amountId of row.amountNodeIds) {
      const cn = classified.get(amountId);
      return {
        amount: cn?.amount ?? index.node(amountId)?.amount ?? null,
        nodeId: amountId,
      };
    }
  }

  return { amount: null, nodeId: null };
}

export function buildProductBlocks(
  chains: readonly ChainView[],
  index: GraphIndex,
  classified: ClassifiedGraph,
  assigned: Set<string>
): ProductBlock[] {
  const map = new Map(classified.nodes.map((n) => [n.id, n]));
  const products: ProductBlock[] = [];

  for (const chain of chains) {
    // PRODUCTS section only (coarse body after segmentation).
    if (chain.rows[0]?.region !== "body") continue;
    if (!isProductChain(chain, map)) continue;
    // Skip only when a primary product label/amount node is already claimed.
    // A stray metadata claim on a structural token must not kill the chain.
    const primaryIds = chain.rows.flatMap((row) => [
      row.rawLineId,
      ...(row.nameFragmentId ? [row.nameFragmentId] : []),
      ...row.boundAmountNodeIds,
      ...row.amountNodeIds,
    ]);
    if (primaryIds.some((id) => assigned.has(id))) continue;

    const labelParts = chain.rows
      .map((row) => {
        const fragId = row.nameFragmentId;
        if (fragId) return index.node(fragId)?.text ?? "";
        return row.rawLineNode.text;
      })
      .filter(Boolean);

    const label = labelParts.join(" ").trim() || chain.headRawLineId;
    // Defense: never emit totals/payment/card-slip text as a product.
    if (
      /\b(toplam|topkdv|nakit|kredi|banka|aid|term|onay|ref|paywave|mersis|www)\b/i.test(
        label
      )
    ) {
      continue;
    }

    let quantity: string | null = null;
    const unit: string | null = null;
    let unitPrice: number | null = null;
    let vatToken: string | null = null;

    for (const row of chain.rows) {
      for (const tokenId of row.tokenNodeIds) {
        const token = index.node(tokenId);
        if (!token) continue;
        if (token.kind === "quantity_token") quantity = token.text;
        if (token.kind === "unit_price_token") unitPrice = token.amount ?? null;
        if (token.kind === "vat_token") vatToken = token.text;
      }
    }

    // Sold-weight / fuel: unit price lives inside the qty expression.
    const embeddedUnit = quantity ? extractSoldUnitPrice(quantity) : undefined;
    if (embeddedUnit != null) unitPrice = embeddedUnit.amount;

    const total = pickLineTotal(index, chain, map);
    const nodeRefs = Object.freeze([...chain.allNodeIds]);
    nodeRefs.forEach((id) => assigned.add(id));

    const confidences = nodeRefs
      .map((id) => map.get(id)?.confidence ?? 0)
      .filter((c) => c > 0);

    products.push(
      Object.freeze({
        id: `product:${chain.headRawLineId}`,
        kind: "product",
        label,
        quantity,
        unit,
        unitPrice,
        totalPrice: total.amount,
        vatToken,
        chainRawLineIds: chain.rawLineIds,
        rawLines: chain.provenance.rawTexts,
        groupIds: nodeRefs,
        nodeRefs,
        provenance: provenanceFromNodes(nodeRefs, map),
        confidence: averageConfidence(confidences),
      })
    );
  }

  return products;
}
