import { RULE_CONFIDENCE } from "../constants";
import {
  matchesCharge,
  matchesDiscount,
  matchesPayment,
  matchesSubtotal,
  matchesTotal,
} from "../patterns";
import { candidate, type NodeClassifier } from "../classifierTypes";
import type { GraphContext } from "../graphContext";

function labelSemantic(
  text: string,
  ctx: GraphContext,
  rawId: string
): ReturnType<NodeClassifier> {
  if (matchesTotal(text)) {
    return [
      candidate(
        "total",
        RULE_CONFIDENCE.exactLabel,
        "amountClassifier:total_label",
        `label matches total pattern: ${text}`
      ),
    ];
  }
  if (matchesSubtotal(text)) {
    return [
      candidate(
        "subtotal",
        RULE_CONFIDENCE.exactLabel,
        "amountClassifier:subtotal_label",
        `label matches subtotal pattern: ${text}`
      ),
    ];
  }
  if (matchesPayment(text)) {
    return [
      candidate(
        "payment",
        RULE_CONFIDENCE.exactLabel,
        "amountClassifier:payment_label",
        `label matches payment pattern: ${text}`
      ),
    ];
  }
  if (matchesCharge(text)) {
    return [
      candidate(
        "charge",
        RULE_CONFIDENCE.exactLabel,
        "amountClassifier:charge_label",
        `label matches charge pattern: ${text}`
      ),
    ];
  }
  if (matchesDiscount(text)) {
    return [
      candidate(
        "discount",
        RULE_CONFIDENCE.exactLabel,
        "amountClassifier:discount_label",
        `label matches discount pattern: ${text}`
      ),
    ];
  }
  if (ctx.regionOfRaw(rawId) === "body" && ctx.isProductEligibleRaw(rawId)) {
    return [
      candidate(
        "product",
        RULE_CONFIDENCE.inferred,
        "amountClassifier:product_line_amount",
        "amount on product section row"
      ),
    ];
  }
  return [];
}

export const amountClassifier: NodeClassifier = (node, ctx) => {
  if (node.kind !== "amount") return [];

  const bindRawId = ctx.amountOfTarget(node.id);
  const rawId =
    bindRawId ??
    ctx.edgesFrom(node.id).find((edge) => edge.kind === "same_row")?.to ??
    null;
  if (!rawId) return [];

  const labelText = ctx.nameText(rawId) || ctx.rawLineText(rawId);
  const labelMatches = labelSemantic(labelText, ctx, rawId);
  if (labelMatches.length > 0) return labelMatches;

  if (ctx.hasUnitPriceToken(rawId)) {
    return [
      candidate(
        "other",
        RULE_CONFIDENCE.structural,
        "amountClassifier:unit_price_row",
        "amount coexists with unit_price_token on same row"
      ),
    ];
  }

  if (ctx.isProductEligibleRaw(rawId)) {
    return [
      candidate(
        "product",
        RULE_CONFIDENCE.inferred,
        "amountClassifier:product_section_amount",
        "amount in products section"
      ),
    ];
  }

  return [];
};
