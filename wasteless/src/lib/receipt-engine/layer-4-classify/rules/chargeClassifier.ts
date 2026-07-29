import { RULE_CONFIDENCE } from "../constants";
import { matchesCharge } from "../patterns";
import { candidate, type NodeClassifier } from "../classifierTypes";

export const chargeClassifier: NodeClassifier = (node) => {
  if (!matchesCharge(node.text)) return [];

  return [
    candidate(
      "charge",
      RULE_CONFIDENCE.exactLabel,
      "chargeClassifier:label",
      `charge label pattern: ${node.text}`
    ),
  ];
};
