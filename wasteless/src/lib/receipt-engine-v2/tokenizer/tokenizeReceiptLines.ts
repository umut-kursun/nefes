import { LineKind } from "./LineKind";
import type { TokenizedLine, TokenizedReceipt } from "./TokenizedLine";

type LineClassifier = {
  readonly kind: LineKind;
  readonly pattern: RegExp;
};

/** Ordered most-specific first — first match wins. */
const LINE_CLASSIFIERS: readonly LineClassifier[] = [
  {
    kind: LineKind.QuantityDetail,
    pattern:
      /^\s*\d+(?:[.,]\d+)?\s*(?:AD|ADET|KG|G|LT|L|ML|PK)\s+x\s+\d/i,
  },
  {
    kind: LineKind.OrphanAmount,
    pattern: /^\s*\*[\d.,]+\s*$/,
  },
  {
    kind: LineKind.PaymentAmount,
    pattern: /^\s*\d{1,3}(?:\.\d{3})*,\d{2}\s*TL\s*$/i,
  },
  {
    kind: LineKind.PaymentAmount,
    pattern: /^\s*[\d.,]+\s*TL\s*$/i,
  },
  {
    kind: LineKind.DiscountCandidate,
    pattern:
      /(?:[İI]ND[İI]R[İI]M|[İI]SKONTO|KAMPANYA|KUPON|C[UÜ]Z[DĐ]AN)/i,
  },
  {
    kind: LineKind.VatTotal,
    pattern: /^\s*TOP\s*KDV\b/i,
  },
  {
    kind: LineKind.Subtotal,
    pattern: /^\s*ARA\s+TOPLAM\b/i,
  },
  {
    kind: LineKind.GrandTotal,
    pattern: /^\s*TOPLAM\b/i,
  },
  {
    kind: LineKind.PaymentHeader,
    pattern:
      /(?:BANKA\s*\/\s*KRED[İI]|KRED[İI]\s*KART|NAK[İI]T|DEB[İI]T|VISA|MASTERCARD|YAPI\s*KRED[İI]|Z[İI]RAAT|GARANT[İI]|AKBANK|[İI][ŞS]\s*BANK|POS\s*[ÖO]DEME|ÖDEME|ODEME)/i,
  },
  {
    kind: LineKind.ChargeCandidate,
    pattern:
      /(?:PO[ŞS]ET|PLAST[İI]K\s+PO[ŞS]ET|KARGO|SERV[İI]S\s+[ÜU]CR|AMBALAJ|BAG\s+FEE)/i,
  },
  {
    kind: LineKind.Metadata,
    pattern:
      /(?:TAR[İI]H|SAAT|F[İI][ŞS]\s*NO|FATURA\s*NO|VKN|TCKN|VERG[İI]\s*NO|VD\.|MERS[İI]S|EKU\s*NO|Z\s*NO|E-AR[ŞS][İI]V|FATURA\s*NO|#\d{8,})/i,
  },
  {
    kind: LineKind.Metadata,
    pattern: /^\s*\d{2}\s*[A-ZÇĞİÖŞÜ]{1,3}\s*\d{2,4}\s*$/,
  },
  {
    kind: LineKind.Metadata,
    pattern: /^\s*\d{2}[./-]\d{2}[./-]\d{4}(?:\s+\d{2}:\d{2})?\s*$/,
  },
  {
    kind: LineKind.MerchantHeader,
    pattern:
      /(?:A\.[ŞS]\.|LTD\.?\s*[ŞS]T[İI]|RESTORAN|T[İI]CARET|PETROL|MARKET|ECZANE|CAFE|CAFÉ|BİSTRO|DÖNER|DONER)/i,
  },
  {
    kind: LineKind.MerchantHeader,
    pattern: /(?:MAH\.|CAD\.|\bCD\b|\bSK\b|SOK\.|BULVAR|NO:\s*\d)/i,
  },
  {
    kind: LineKind.Footer,
    pattern:
      /(?:TE[ŞS]EKK[ÜU]R|WWW\.|MAL[İI]\s+DE[ĞG]ER|[İI]ADE\s+POL[İI]T|[İI][ŞS]LEM\s+NO|BANKA\s+ONAY|F[İI]YAT(?:LAR)?\s+DE[ĞG][İI][ŞS])/i,
  },
  {
    kind: LineKind.ProductCandidate,
    pattern:
      /(?:BENZ[İI]N|MOTOR[İI]N|D[İI]ZEL|LPG|EURO\s*D[İI]ESEL).*\d+(?:[.,]\d+)?\s*(?:LT|L)\b/i,
  },
  {
    kind: LineKind.ProductCandidate,
    pattern: /\*\s*[\d.,]+/,
  },
  {
    kind: LineKind.ProductCandidate,
    pattern: /%\s*\d+(?:[.,]\d+)?\s+\d{1,3}(?:\.\d{3})*,\d{2}\s*$/,
  },
  {
    kind: LineKind.ProductCandidate,
    pattern: /%\s*\d+(?:[.,]\d+)?\s+\d+[.,]\d{2}\s*$/,
  },
  {
    kind: LineKind.ProductCandidate,
    pattern: /%\s*\d+\s*[.,]\s*\*?\s*[\d.,]+/,
  },
];

function classifyLine(raw: string): LineKind {
  const trimmed = raw.trim();
  if (!trimmed) return LineKind.Empty;

  for (const { kind, pattern } of LINE_CLASSIFIERS) {
    if (pattern.test(raw)) return kind;
  }

  return LineKind.Unknown;
}

export function tokenizeLine(raw: string): TokenizedLine {
  return {
    kind: classifyLine(raw),
    raw,
  };
}

/** Label each OCR line independently — one TokenizedLine per input line. */
export function tokenizeReceiptLines(lines: readonly string[]): TokenizedReceipt {
  return {
    lines: lines.map((line) => tokenizeLine(line)),
  };
}

/** Flat array helper for downstream parsers. */
export function tokenizeReceiptLinesFlat(
  lines: readonly string[]
): readonly TokenizedLine[] {
  return tokenizeReceiptLines(lines).lines;
}

export { LINE_CLASSIFIERS };
