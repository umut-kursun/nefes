import { RULE_CONFIDENCE } from "../constants";
import { candidate, type NodeClassifier } from "../classifierTypes";
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
    if (ctx.isFirstHeaderLine(node)) {
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
