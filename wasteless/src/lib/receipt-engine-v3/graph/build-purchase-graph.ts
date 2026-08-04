import { parseDate } from "@/lib/receipt-engine/layer-6-purchase/parsers/dateParser";
import { parseReceiptNumber } from "@/lib/receipt-engine/layer-6-purchase/parsers/receiptNumberParser";
import { parseTime } from "@/lib/receipt-engine/layer-6-purchase/parsers/timeParser";
import type {
  FieldConfidence,
  LabeledAmount,
  NormalizedPurchase,
  ProductEntity,
  PurchaseGraph,
  ReceiptProfile,
} from "../types";
import type { SemanticDocument } from "../types/semantic-block";
import {
  PAYMENT_LABEL,
  RECEIPT_NO_LABEL,
  TOTAL_LABEL,
  VAT_LABEL,
  Z_NO_LABEL,
  trailingAmount,
} from "../semantic/patterns";
import { parserForProfile } from "../profile/parsers";
import { merchantConfidenceFromScores, scoreMerchantFingerprints } from "../merchant/knowledge-base";

function conf(value: number, ...reasons: string[]): FieldConfidence {
  return { value, reasons };
}

/** Stages 5â€“6 â€” profile parser + metadata/payment entity extraction. */
export function buildPurchaseGraph(
  doc: SemanticDocument,
  profile: ReceiptProfile
): PurchaseGraph {
  const parser = parserForProfile(profile);
  const products = parser.parseProducts(doc);

  let merchant: string | null = null;
  let merchantConfidence = conf(0.3, "missing");
  for (const block of doc.blocks) {
    if (block.type === "MerchantBlock") {
      merchant = block.text.trim();
      merchantConfidence = conf(0.9, "merchant-block");
      break;
    }
  }
  if (!merchant) {
    const first = doc.blocks.find(
      (b) =>
        b.type === "UnknownBlock" &&
        b.lineIndices[0] === doc.blocks[0]?.lineIndices[0]
    );
    if (first && first.text.length > 2) {
      merchant = first.text.trim();
      merchantConfidence = conf(0.65, "first-line-merchant");
    }
  }
  if (!merchant) {
    const first = doc.blocks.find(
      (b) => b.type === "UnknownBlock" && /\b(a\.?\s*ÅŸ|tic\.|ltd|petrol|eczane|market|shop|restaurant|restoran)\b/i.test(b.text)
    );
    if (first) {
      merchant = first.text.trim();
      merchantConfidence = conf(0.7, "corporate-fallback");
    }
  }

  const fingerprintScores = scoreMerchantFingerprints(
    doc.blocks.map((b) => b.text).join("\n")
  );
  if (fingerprintScores.length > 0) {
    const fpConf = merchantConfidenceFromScores(fingerprintScores);
    if (!merchant || fpConf.value > merchantConfidence.value) {
      const topId = fingerprintScores[0]!.id;
      const hintLine = doc.blocks.find((b) =>
        new RegExp(topId.replace(/-/g, "[\\s-]?"), "i").test(b.text)
      );
      if (hintLine) merchant = hintLine.text.trim();
      merchantConfidence = fpConf;
    }
  }

  let purchaseDate: string | null = null;
  let dateConfidence = conf(0.2, "missing");
  let purchaseTime: string | null = null;
  let timeConfidence = conf(0.2, "missing");
  let receiptNumber: string | null = null;
  let receiptNumberConfidence = conf(0.2, "missing");

  for (const block of doc.blocks) {
    const d = parseDate(block.text);
    if (d?.normalized && !purchaseDate) {
      purchaseDate = d.normalized;
      dateConfidence = conf(0.88, "date-parser");
    }
    const t = parseTime(block.text);
    if (t?.normalized && !purchaseTime) {
      purchaseTime = t.normalized;
      timeConfidence = conf(0.85, "time-parser");
    }
    const rn = parseReceiptNumber(block.text);
    if (rn?.normalized && !receiptNumber) {
      receiptNumber = rn.normalized;
      receiptNumberConfidence = conf(0.9, "receipt-no");
    }
    const zMatch = block.text.match(Z_NO_LABEL);
    if (zMatch && !receiptNumber) {
      receiptNumberConfidence = conf(0.4, "z-no-not-receipt");
    }
    const explicit = block.text.match(RECEIPT_NO_LABEL);
    if (explicit?.[2]) {
      receiptNumber = explicit[2];
      receiptNumberConfidence = conf(0.92, "explicit-fis-no");
    }
  }

  const charges: LabeledAmount[] = [];
  const discounts: LabeledAmount[] = [];
  const payments: LabeledAmount[] = [];
  const vatSummary: LabeledAmount[] = [];
  const subtotal: LabeledAmount | null = null;
  let total: LabeledAmount | null = null;

  for (const block of doc.blocks) {
    const amount = trailingAmount(block.text);
    const label = block.text.replace(/[\d.,\s]+(?:TL|â‚º)?$/, "").trim();
    const item = {
      label: label || block.text,
      amount,
      confidence: conf(0.85, block.type),
    };
    switch (block.type) {
      case "ChargeBlock":
        charges.push(item);
        break;
      case "DiscountBlock":
        discounts.push(item);
        break;
      case "PaymentBlock":
        if (PAYMENT_LABEL.test(block.text)) payments.push(item);
        break;
      case "POSBlock":
        if (PAYMENT_LABEL.test(block.text) && amount != null) payments.push(item);
        break;
      case "VATBlock":
        if (VAT_LABEL.test(block.text)) vatSummary.push(item);
        break;
      case "TotalBlock":
        if (TOTAL_LABEL.test(block.text)) total = item;
        break;
      default:
        if (PAYMENT_LABEL.test(block.text) && amount != null) {
          payments.push(item);
        } else if (TOTAL_LABEL.test(block.text) && amount != null) {
          total = item;
        } else if (VAT_LABEL.test(block.text) && amount != null) {
          vatSummary.push(item);
        }
        break;
    }
  }

  if (merchant) {
    merchant = merchant.replace(/m\s*i\s*g\s*r\s*o\s*s/gi, "MIGROS").replace(/\s{2,}/g, " " ).trim();
  }

  const purchase: NormalizedPurchase = {
    merchant,
    merchantConfidence,
    purchaseDate,
    dateConfidence,
    purchaseTime,
    timeConfidence,
    receiptNumber,
    receiptNumberConfidence,
    currency: "TRY",
    products,
    charges,
    discounts,
    payments,
    vatSummary,
    subtotal,
    total,
    profile,
  };

  return { profile, purchase };
}

export function stripProductNames(products: readonly ProductEntity[]): readonly ProductEntity[] {
  return products;
}


