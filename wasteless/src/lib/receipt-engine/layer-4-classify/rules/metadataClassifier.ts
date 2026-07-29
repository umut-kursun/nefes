import type { ClassificationCandidate } from "../../types/models/classify";
import { RULE_CONFIDENCE } from "../constants";
import {
  matchesBarcode,
  matchesDate,
  matchesLoyalty,
  matchesReceiptNumber,
  matchesSeparator,
  matchesSubtotal,
  matchesTime,
  matchesTotal,
} from "../patterns";
import { candidate, type NodeClassifier } from "../classifierTypes";

export const metadataClassifier: NodeClassifier = (node) => {
  const text = node.text.trim();
  const results: ClassificationCandidate[] = [];

  if (node.kind === "noise" || matchesBarcode(text.replace(/\s/g, ""))) {
    results.push(
      candidate(
        "barcode",
        RULE_CONFIDENCE.structural,
        "metadataClassifier:barcode",
        "barcode noise pattern"
      )
    );
  }

  if (node.kind === "noise" && matchesSeparator(text)) {
    results.push(
      candidate(
        "separator",
        RULE_CONFIDENCE.structural,
        "metadataClassifier:separator",
        "separator noise pattern"
      )
    );
  }

  // Structural product tokens must not be reclassified as clock times/dates
  // (e.g. unit price "79,17" / "79.17" looks like HH.MM).
  const isStructuralProductToken =
    node.kind === "quantity_token" || node.kind === "unit_price_token";

  if (matchesDate(text) && !isStructuralProductToken) {
    results.push(
      candidate(
        "date",
        RULE_CONFIDENCE.exactLabel,
        "metadataClassifier:date",
        `date pattern: ${text}`
      )
    );
  }

  if (matchesTime(text) && !isStructuralProductToken) {
    results.push(
      candidate(
        "time",
        RULE_CONFIDENCE.exactLabel,
        "metadataClassifier:time",
        `time pattern: ${text}`
      )
    );
  }

  if (matchesReceiptNumber(text)) {
    results.push(
      candidate(
        "receipt_number",
        RULE_CONFIDENCE.exactLabel,
        "metadataClassifier:receipt_number",
        `receipt number pattern: ${text}`
      )
    );
  }

  if (matchesLoyalty(text)) {
    results.push(
      candidate(
        "loyalty",
        RULE_CONFIDENCE.exactLabel,
        "metadataClassifier:loyalty",
        `loyalty pattern: ${text}`
      )
    );
  }

  if (matchesTotal(text)) {
    results.push(
      candidate(
        "total",
        RULE_CONFIDENCE.exactLabel,
        "metadataClassifier:total_label",
        `total label: ${text}`
      )
    );
  }

  if (matchesSubtotal(text)) {
    results.push(
      candidate(
        "subtotal",
        RULE_CONFIDENCE.exactLabel,
        "metadataClassifier:subtotal_label",
        `subtotal label: ${text}`
      )
    );
  }

  if (
    node.kind === "quantity_token" ||
    node.kind === "unit_price_token"
  ) {
    results.push(
      candidate(
        "other",
        RULE_CONFIDENCE.structural,
        "metadataClassifier:structural_token",
        "neutral graph token"
      )
    );
  }

  return results;
};
