import { RULE_CONFIDENCE } from "../constants";
import { matchesSpecialFooterLabel } from "../patterns";
import { candidate, type NodeClassifier } from "../classifierTypes";
import type { GraphContext } from "../graphContext";
import {
  CARD_SLIP_MARKER,
  FOOTER_MARKER,
  PAYMENTS_MARKER,
  TOTALS_MARKER,
} from "../../document-segmentation/sectionMarkers";

/**
 * Product candidates are allowed ONLY in the PRODUCTS section
 * (coarse region `body` after document segmentation).
 *
 * Defense-in-depth: structural footer/payment/card-slip markers never
 * become products even if segmentation missed a boundary.
 */
function isProductRow(ctx: GraphContext, rawId: string): boolean {
  const region = ctx.regionOfRaw(rawId);
  if (region !== "body") return false;

  const labelText = ctx.combinedRowText(rawId);
  if (matchesSpecialFooterLabel(labelText)) return false;
  if (TOTALS_MARKER.test(labelText)) return false;
  if (PAYMENTS_MARKER.test(labelText)) return false;
  if (CARD_SLIP_MARKER.test(labelText)) return false;
  if (FOOTER_MARKER.test(labelText)) return false;

  return (
    ctx.hasSameRowAmount(rawId) ||
    ctx.hasBoundAmount(rawId) ||
    ctx.hasIncomingContinuation(rawId) ||
    ctx.hasOutgoingContinuation(rawId)
  );
}

export const productCandidateClassifier: NodeClassifier = (node, ctx) => {
  const rawId = ctx.rawLineId(node);
  if (!rawId || !isProductRow(ctx, rawId)) return [];

  if (
    node.kind === "text_fragment" ||
    node.kind === "label" ||
    node.kind === "raw_line"
  ) {
    return [
      candidate(
        "product",
        RULE_CONFIDENCE.inferred,
        "productCandidateClassifier:products_section",
        "PRODUCTS section row with product structure"
      ),
    ];
  }

  if (node.kind === "quantity_token" || node.kind === "unit_price_token") {
    return [
      candidate(
        "product",
        RULE_CONFIDENCE.structural,
        "productCandidateClassifier:product_token",
        "product row structural token"
      ),
      candidate(
        "other",
        RULE_CONFIDENCE.structural,
        "productCandidateClassifier:structural_token",
        "neutral structural token"
      ),
    ];
  }

  return [];
};
