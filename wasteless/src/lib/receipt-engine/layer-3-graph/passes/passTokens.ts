import type { LayoutDocument } from "../../types/models/layout";
import type { GraphBuilderState } from "../graphImmutable";
import { withEdges, withNodes } from "../graphImmutable";
import {
  quantityTokenId,
  rawLineId,
  unitPriceTokenId,
  vatTokenId,
} from "../graphIds";
import { createNode, relationEdge, sameRowEdge } from "../graphNodes";
import { extractSoldUnitPrice } from "../../layer-6-purchase/parsers/purchasedQuantity";

export function passTokens(
  state: GraphBuilderState,
  layout: LayoutDocument
): GraphBuilderState {
  let next = state;
  const nodes = [];
  const edges = [];

  for (const line of layout.lines) {
    const rawId = rawLineId(line.index);
    const vatText = line.tokens?.vat?.trim() ?? line.columns?.vat?.trim();
    const qtyText = line.tokens?.quantity?.trim();

    if (vatText && !line.features.isAmountOnly) {
      nodes.push(
        createNode(
          vatTokenId(line.index),
          "vat_token",
          vatText,
          line,
          "passTokens:vat"
        )
      );
      edges.push(sameRowEdge(vatTokenId(line.index), rawId, line.confidence));
      edges.push(
        relationEdge(vatTokenId(line.index), rawId, "vat_of", line.confidence)
      );
    }

    if (qtyText) {
      nodes.push(
        createNode(
          quantityTokenId(line.index),
          "quantity_token",
          qtyText,
          line,
          "passTokens:quantity"
        )
      );
      edges.push(
        sameRowEdge(quantityTokenId(line.index), rawId, line.confidence)
      );
      edges.push(
        relationEdge(
          quantityTokenId(line.index),
          rawId,
          "quantity_of",
          line.confidence
        )
      );
    }

    // Prefer unit price embedded in sold-qty (`N LT x 79,17`) over trailing
    // line total — fuel/single-line weighted rows carry both.
    if (line.features.hasWeightPattern) {
      const embedded =
        (qtyText ? extractSoldUnitPrice(qtyText) : undefined) ??
        extractSoldUnitPrice(line.text);
      const unitPriceAmount =
        embedded?.amount ??
        (line.columns?.amount ? line.trailingAmount : null) ??
        null;
      if (unitPriceAmount != null) {
        const unitText =
          embedded?.raw ??
          line.columns?.amount?.trim() ??
          String(unitPriceAmount);
        nodes.push(
          createNode(
            unitPriceTokenId(line.index),
            "unit_price_token",
            unitText,
            line,
            "passTokens:unit_price",
            unitPriceAmount
          )
        );
        edges.push(
          sameRowEdge(unitPriceTokenId(line.index), rawId, line.confidence)
        );
        edges.push(
          relationEdge(
            unitPriceTokenId(line.index),
            rawId,
            "unit_price_of",
            line.confidence
          )
        );
      }
    }  }

  next = withNodes(next, nodes);
  next = withEdges(next, edges);
  return next;
}
