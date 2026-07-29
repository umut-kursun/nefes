import { RULE_CONFIDENCE } from "../constants";
import { matchesPayment } from "../patterns";
import { candidate, type NodeClassifier } from "../classifierTypes";

export const paymentClassifier: NodeClassifier = (node) => {
  const text = node.text.trim();
  if (!matchesPayment(text)) return [];

  return [
    candidate(
      "payment",
      RULE_CONFIDENCE.exactLabel,
      "paymentClassifier:label",
      `payment label pattern: ${text}`
    ),
  ];
};
