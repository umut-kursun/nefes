import { RULE_CONFIDENCE } from "../constants";
import { candidate, type NodeClassifier } from "../classifierTypes";
import { CARD_SLIP_MARKER } from "../../document-segmentation/sectionMarkers";

/**
 * Card-slip / POS terminal metadata — never products.
 * Only fires in footer-like regions (post-PRODUCTS sections).
 */
export const cardSlipClassifier: NodeClassifier = (node, ctx) => {
  const rawId = ctx.rawLineId(node);
  if (!rawId) return [];
  if (ctx.regionOfRaw(rawId) !== "footer") return [];

  if (
    node.kind !== "raw_line" &&
    node.kind !== "text_fragment" &&
    node.kind !== "label"
  ) {
    return [];
  }

  const text = ctx.combinedRowText(rawId) || ctx.rawLineText(rawId);
  if (!CARD_SLIP_MARKER.test(text)) return [];

  return [
    candidate(
      "card_slip",
      RULE_CONFIDENCE.exactLabel,
      "cardSlipClassifier:terminal_meta",
      "POS / card-slip terminal metadata"
    ),
  ];
};
