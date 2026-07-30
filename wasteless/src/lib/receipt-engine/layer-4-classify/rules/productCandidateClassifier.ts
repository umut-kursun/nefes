import { RULE_CONFIDENCE } from "../constants";
import { matchesSpecialFooterLabel } from "../patterns";
import { candidate, type NodeClassifier } from "../classifierTypes";
import type { GraphContext } from "../graphContext";

function isProductRow(ctx: GraphContext, rawId: string): boolean {
  if (!ctx.isProductEligibleRaw(rawId)) return false;

  const labelText = ctx.combinedRowText(rawId);
  if (matchesSpecialFooterLabel(labelText)) return false;

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
        "productCandidateClassifier:body_row",
        "body row with product structure"
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
