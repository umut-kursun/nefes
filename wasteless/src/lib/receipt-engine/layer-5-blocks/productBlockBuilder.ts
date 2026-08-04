import type { ClassifiedGraph, ClassifiedNode, SemanticKind } from "../types/models/classify";
import type { GraphIndex } from "../graph/graphIndex";
import type { ChainView } from "../graph/chainView";
import type { ProductBlock } from "../types/models/blocks";
import { averageConfidence, provenanceFromNodes } from "./blockProvenance";
import { isAddressLikeLine, TOPKDV_HINT, isVknLine, isTaxOfficeLine } from "../patterns/document";
import { stripProductNameDecorations } from "../patterns/lineSanitize";
import { isFuelVatStarLine } from "../layer-6-purchase/section-parsers/fuelProductParser";
import { isVatOcrToken, matchesDate, matchesReceiptNumber, matchesTime, matchesVatLabel, HAS_LETTERS } from "../patterns/neutral";
import { isSplitProductAmountLine } from "../layer-2-layout/lineUtils";

const PRODUCT_KINDS = new Set<SemanticKind>(["product"]);

function isAddressOrHeaderChain(chain: ChainView, index: GraphIndex): boolean {
  const texts = chain.provenance.rawTexts;
  if (texts.every((t) => isAddressLikeLine(t))) return true;
  if (texts.some((t) => isAddressLikeLine(t)) && !texts.some(isRealProductName)) {
    return true;
  }
  const headType = index.lineSemanticTypeOfRaw(chain.headRawLineId);
  if (headType === "AddressLine") return true;
  return false;
}

function isRealProductName(text: string): boolean {
  const t = text.trim();
  if (!t || isAddressLikeLine(t)) return false;
  if (matchesDate(t) || matchesTime(t) || matchesReceiptNumber(t)) return false;
  if (isSplitProductAmountLine(t)) return false;
  if (/^[-=*_]+$/.test(t)) return false;
  if (/\dnull\b/i.test(t)) return false;
  return HAS_LETTERS.test(t);
}

function normalizeProductLabel(label: string, rawLines: readonly string[]): string {
  const cleaned = stripProductNameDecorations(label.replace(/^\*\s*/, "").trim());
  if (cleaned && cleaned !== "*" && !/^[*×x]\s*$/.test(cleaned)) return cleaned;

  for (let i = rawLines.length - 1; i >= 0; i--) {
    const line = stripProductNameDecorations(rawLines[i]?.trim() ?? "");
    if (isRealProductName(line)) return line;
  }
  return cleaned || label;
}

function isProductChain(
  chain: ChainView,
  classified: Map<string, ClassifiedNode>,
  index: GraphIndex
): boolean {
  const headType = index.lineSemanticTypeOfRaw(chain.headRawLineId);
  if (headType === "FuelLine") return true;

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
    const headRawId = chain.headRawLineId;
    const section = index.sectionOfRaw(headRawId);
    const lineType = index.lineSemanticTypeOfRaw(headRawId);
    if (section !== "products") continue;
    if (
      lineType === "PaymentLine" ||
      lineType === "TotalLine" ||
      lineType === "SubtotalLine" ||
      lineType === "VatSummaryLine" ||
      lineType === "ChargeLine" ||
      lineType === "DiscountLine" ||
      lineType === "CardSlipLine" ||
      lineType === "FooterLine" ||
      lineType === "LoyaltyLine" ||
      lineType === "LineTotalLine"
    ) {
      continue;
    }
    if (!isProductChain(chain, map, index)) continue;
    if (chain.allNodeIds.some((id) => assigned.has(id))) continue;
    if (isAddressOrHeaderChain(chain, index)) continue;

    const labelParts = chain.rows
      .map((row) => {
        const fragId = row.nameFragmentId;
        if (fragId) return index.node(fragId)?.text ?? "";
        return row.rawLineNode.text;
      })
      .filter(Boolean);

    const label = normalizeProductLabel(
      labelParts.join(" ").trim() || chain.headRawLineId,
      chain.provenance.rawTexts
    );
    const rawBlob = chain.provenance.rawTexts.join("\n");
    if (isAddressLikeLine(label)) continue;
    if (/\dnull\b/i.test(label)) continue;
    if (chain.provenance.rawTexts.some((t) => isVknLine(t) || isTaxOfficeLine(t))) {
      continue;
    }
    if (
      isAddressLikeLine(label) ||
      chain.provenance.rawTexts.every((t) => isAddressLikeLine(t))
    ) {
      continue;
    }
    if (
      isFuelVatStarLine(label) &&
      !chain.provenance.rawTexts.some((t) => /motor[iİI]n|benzin|dizel|lpg/i.test(t))
    ) {
      continue;
    }
    if (isVatOcrToken(label.replace(/\s*\*.*$/, "").trim())) continue;
    const total = pickLineTotal(index, chain, map);
    if (!isRealProductName(label) && total.amount == null) {
      continue;
    }
    if (
      TOPKDV_HINT.test(label) ||
      TOPKDV_HINT.test(rawBlob) ||
      /^\s*topkd:?/i.test(label) ||
      (matchesVatLabel(label) && lineType !== "FuelLine")
    ) {
      continue;
    }
    if (/^\d{1,2}\s*[,.\s]*[A-Za-zÇĞİÖŞÜ]{2,5}\.\s*[xX×]/i.test(label)) {
      continue;
    }
    if (/^\d+\s*adet\s*\.?$/i.test(label)) {
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
