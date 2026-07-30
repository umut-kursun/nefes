import { RULE_CONFIDENCE } from "../constants";
import { candidate, type NodeClassifier } from "../classifierTypes";
import { scoreMerchantCandidates } from "../../layer-5-blocks/merchantScorer";

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
    const headerLines = ctx.indexView.headerLinesForMerchant();
    const ranked = scoreMerchantCandidates(headerLines);
    const match = ranked.find((c) => c.lineIndex === node.layoutRef.lineIndex);
    const score = match?.score ?? 0;

    const candidates = [
      candidate(
        "header",
        RULE_CONFIDENCE.region,
        "headerClassifier:header_fragment",
        "header region name fragment"
      ),
    ];

    if (score > 0 && match && match.text === node.text) {
      const conf = Math.min(
        0.95,
        RULE_CONFIDENCE.region + score / 200
      );
      candidates.unshift(
        candidate(
          "merchant",
          conf,
          "headerClassifier:merchant_scored",
          `merchant score=${score} (${match.reasons.join(",")})`
        )
      );
    }

    return candidates;
  }

  return [];
};
