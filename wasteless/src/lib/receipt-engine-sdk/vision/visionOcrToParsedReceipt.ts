import { parseTrNumber } from "@/lib/receipt-engine/layer-6-purchase/parsers/parseNumber";

import type {

  DiscountInfo,

  ParsedReceipt,

  PaymentInfo,

  ReceiptItem,

} from "../types/ParsedReceipt";

import { parseMultiplierText } from "./mergeStandaloneMultiplierProducts";

import type { VisionLineKind, VisionOcrExtract, VisionReceiptLine } from "./visionOcrExtract";



/** Turkish receipt amount: 644,05 | 1.295,00 | 2125,57 */
const TR_AMOUNT = String.raw`-?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|-?\d+(?:,\d{1,2})?`;

const LINE_WITH_AMOUNT =
  new RegExp(String.raw`^(.+?)\s*\*+\s*(${TR_AMOUNT})\s*$`);

const DISCOUNT_LINE =

  /(?:^|\s)(?:%?\s*\d+\s*%\s*)?[İI]ND[İI]R[İI]M|INDIRIM|KAMPANYA|İSKONTO|ISKONTO|KUPON|COUPON/i;



const CHARGE_LINE =

  /POŞET|POS ET|PLAST[İI]K\s*POŞET|KARGO|TESL[İI]MAT|SERV[İI]S|AMBALAJ|KURYE|BAĞIŞ|YUVARLAMA|DELIVERY|BAG/i;



const FOOTER_TOTAL = new RegExp(
  String.raw`(?:TOPLAM|ÖDENECEK|GENEL\s*TOPLAM|ODENECEK).*?(${TR_AMOUNT})`,
  "i"
);

const FOOTER_VAT = new RegExp(
  String.raw`(?:TOP\s*KDV|TOPLAM\s*KDV|TOPKDV).*?(${TR_AMOUNT})`,
  "i"
);



const PAYMENT_CARD =

  /KRED[İI]\s*KART|CREDIT\s*CARD|BANKA\s*KART|VISA|MASTERCARD|MAESTRO/i;

const PAYMENT_CASH = /NAK[İI]T|CASH/i;



function parseLineAmount(line: string): { name: string; amount: number | null } {

  const match = line.trim().match(LINE_WITH_AMOUNT);

  if (!match?.[1] || !match[2]) {

    return { name: line.trim(), amount: null };

  }

  const amount = parseTrNumber(match[2]);

  return {

    name: match[1]!.trim(),

    amount: amount ?? null,

  };

}



function isDiscountLine(text: string): boolean {

  return DISCOUNT_LINE.test(text);

}



function isChargeLine(text: string): boolean {

  return CHARGE_LINE.test(text);

}



function isMultiplierOnlyLine(text: string): boolean {

  return parseMultiplierText(text.trim()) != null;

}



function inferLineKind(text: string): VisionLineKind {

  if (isMultiplierOnlyLine(text)) return "quantity";

  if (isDiscountLine(text)) return "discount";

  if (isChargeLine(text)) return "charge";

  return "product";

}



function resolveLineKind(line: VisionReceiptLine): VisionLineKind {

  if (line.kind && line.kind !== "product") return line.kind;

  if (line.kind === "product") {

    const inferred = inferLineKind(line.text);

    return inferred !== "product" ? inferred : "product";

  }

  return inferLineKind(line.text);

}



function parseFooterTotal(footerLines: readonly string[]): number {

  for (const line of footerLines) {

    const match = line.match(FOOTER_TOTAL);

    if (!match?.[1]) continue;

    const amount = parseTrNumber(match[1]);

    if (amount != null && amount > 0) return amount;

  }

  return 0;

}



function parseFooterVat(footerLines: readonly string[]): number | null {

  for (const line of footerLines) {

    const match = line.match(FOOTER_VAT);

    if (!match?.[1]) continue;

    const amount = parseTrNumber(match[1]);

    if (amount != null && amount >= 0) return amount;

  }

  return null;

}



function parsePaymentLine(line: string): PaymentInfo | null {

  const { name, amount } = parseLineAmount(line);

  if (amount == null || amount <= 0) return null;

  const blob = `${name} ${line}`;

  let type: PaymentInfo["type"] = "OTHER";

  if (PAYMENT_CARD.test(blob)) type = "CREDIT_CARD";

  else if (PAYMENT_CASH.test(blob)) type = "CASH";

  return {

    type,

    amount,

    bankName: null,

    cardLastFour: null,

    approvalCode: null,

  };

}



function productFromLine(line: string): ReceiptItem | null {

  if (!line.trim()) return null;



  const { name, amount } = parseLineAmount(line);

  if (!name) return null;



  return {

    name,

    lineTotal: amount != null && amount >= 0 ? amount : 0,

  };

}



function discountFromLine(line: string): DiscountInfo | null {

  if (!isDiscountLine(line)) return null;

  const { name, amount } = parseLineAmount(line);

  if (amount == null || amount === 0) {

    const fallback = parseTrNumber(line.replace(/[^\d,.-]/g, " ").trim());

    if (fallback == null || fallback === 0) return null;

    return {

      name: name || "İNDİRİM",

      amount: fallback < 0 ? fallback : -Math.abs(fallback),

      linkedProductName: null,

    };

  }

  return {

    name: name || "İNDİRİM",

    amount: amount < 0 ? amount : -Math.abs(amount),

    linkedProductName: null,

  };

}



/**

 * Convert slim Vision OCR output into ParsedReceipt for the deterministic parser.

 * Uses Vision row classification when present; regex fallback for legacy string lines.

 */

export function visionOcrToParsedReceipt(extract: VisionOcrExtract): ParsedReceipt {

  const products: ReceiptItem[] = [];

  const discounts: DiscountInfo[] = [];



  for (const line of extract.productLines) {

    const kind = resolveLineKind(line);

    const text = line.text;



    if (kind === "quantity" || kind === "component") continue;



    if (kind === "discount") {

      const discount = discountFromLine(text);

      if (discount) discounts.push(discount);

      continue;

    }



    if (kind === "charge" || kind === "product") {

      const product = productFromLine(text);

      if (product) products.push(product);

    }

  }



  const totalAmount = parseFooterTotal(extract.footerLines);

  const vatTotal = parseFooterVat(extract.footerLines);



  if (products.length === 0) {

    products.push({

      name: "Okunamayan kalem",

      lineTotal: totalAmount > 0 ? totalAmount : 0.01,

    });

  }



  const payments = extract.paymentLines

    .map(parsePaymentLine)

    .filter((p): p is PaymentInfo => p != null);



  return {

    merchant: {

      title: extract.merchant.title,

      category: extract.merchant.category,

      vknTckn: null,

      taxOffice: null,

      address: null,

    },

    metadata: {

      purchaseDate: extract.metadata.purchaseDate,

      purchaseTime: extract.metadata.purchaseTime ?? null,

      receiptNumber: extract.metadata.receiptNumber ?? null,

      currency: extract.metadata.currency ?? "TRY",

    },

    products,

    discounts,

    payments,

    financials: {

      totalAmount: totalAmount > 0 ? totalAmount : 0,

      ...(vatTotal != null ? { vatTotal } : {}),

    },

    rawText: extract.rawText,

    confidence: extract.confidence,

  };

}


