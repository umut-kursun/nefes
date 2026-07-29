import { RULE_CONFIDENCE } from "../constants";
import { matchesDiscount } from "../patterns";
import { candidate, type NodeClassifier } from "../classifierTypes";

export const discountClassifier: NodeClassifier = (node) => {
  if (!matchesDiscount(node.text)) return [];

  return [
    candidate(
      "discount",
      RULE_CONFIDENCE.exactLabel,
      "discountClassifier:label",
      `discount label pattern: ${node.text}`
    ),
  ];
};
