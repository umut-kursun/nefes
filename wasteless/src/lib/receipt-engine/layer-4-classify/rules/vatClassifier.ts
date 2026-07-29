import { RULE_CONFIDENCE } from "../constants";
import { matchesVatLabel } from "../patterns";
import { candidate, type NodeClassifier } from "../classifierTypes";

export const vatClassifier: NodeClassifier = (node) => {
  if (node.kind === "vat_token") {
    return [
      candidate(
        "vat",
        RULE_CONFIDENCE.structural,
        "vatClassifier:vat_token",
        "graph vat_token node"
      ),
    ];
  }

  if (matchesVatLabel(node.text)) {
    return [
      candidate(
        "vat",
        RULE_CONFIDENCE.exactLabel,
        "vatClassifier:label",
        `vat label pattern: ${node.text}`
      ),
    ];
  }

  return [];
};
