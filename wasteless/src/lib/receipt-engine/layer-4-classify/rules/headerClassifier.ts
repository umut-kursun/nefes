import { RULE_CONFIDENCE } from "../constants";
import { candidate, type NodeClassifier } from "../classifierTypes";
import { scoreMerchantLine } from "../../merchant/merchantScorer";

const ADDRESS_LIKE =
  /\b(mah\.?|mahalle|cad\.?|caddesi|sok\.?|sokak|no\s*:?\s*\d|kat\s*:?\s*\d)\b/i;

export const headerClassifier: NodeClassifier = (node, ctx) => {
  const rawId = ctx.rawLineId(node);
  if (!rawId) return [];

  const region = ctx.regionOfRaw(rawId);
  if (region !== "header") return [];

  if (node.kind === "raw_line") {
    return [
      candidate(
        "header",
        RULE_CONFIDENCE.region,
        "headerClassifier:raw_line",
        "raw line in header region"
      ),
    ];
  }

  if (node.kind === "text_fragment" || node.kind === "label") {
    const text = ctx.nameText(rawId) || ctx.rawLineText(rawId);
    const scored = scoreMerchantLine(text, 0);

    if (ADDRESS_LIKE.test(text) || scored.reasons.includes("address_like")) {
      return [
        candidate(
          "address",
          RULE_CONFIDENCE.inferred,
          "headerClassifier:address",
          "address-like header line"
        ),
        candidate(
          "header",
          RULE_CONFIDENCE.region,
          "headerClassifier:header_fragment",
          "header region name fragment"
        ),
      ];
    }

    if (scored.score >= 0.45) {
      return [
        candidate(
          "merchant",
          Math.min(0.95, scored.score),
          "headerClassifier:merchant_scored",
          `merchant score=${scored.score.toFixed(2)} (${scored.reasons.join(",")})`
        ),
        candidate(
          "header",
          RULE_CONFIDENCE.inferred,
          "headerClassifier:header_fragment",
          "header region name fragment"
        ),
      ];
    }

    if (ctx.isFirstHeaderLine(node) && scored.score >= 0.2) {
      return [
        candidate(
          "merchant",
          RULE_CONFIDENCE.region,
          "headerClassifier:merchant",
          "first header name fragment"
        ),
        candidate(
          "header",
          RULE_CONFIDENCE.inferred,
          "headerClassifier:header_fragment",
          "header region name fragment"
        ),
      ];
    }

    return [
      candidate(
        "header",
        RULE_CONFIDENCE.region,
        "headerClassifier:header_fragment",
        "header region name fragment"
      ),
    ];
  }

  return [];
};
