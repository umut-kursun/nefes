import { RULE_CONFIDENCE } from "../constants";
import { candidate, type NodeClassifier } from "../classifierTypes";
export const footerClassifier: NodeClassifier = (node, ctx) => {
  const rawId = ctx.rawLineId(node);
  if (!rawId) return [];

  const region = ctx.regionOfRaw(rawId);
  if (region !== "footer") return [];

  if (node.kind === "raw_line" || node.kind === "label") {
    return [
      candidate(
        "footer",
        RULE_CONFIDENCE.region,
        "footerClassifier:footer_region",
        "node in footer region"
      ),
    ];
  }

  return [];
};
