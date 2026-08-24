import {
  CORPORATE_SUFFIX,
  isTaxOfficeLine,
  truncateMerchantTitle,
} from "@/lib/receipt-engine/patterns/document";

const LEGAL_SUFFIX_PATTERNS = [
  /\bSAN\.?\s*VE\s*T[İIİi]C\.?\b/gi,
  /\bT[İIİi]C\.?\s*A\.?\s*Ş\.?\b/gi,
  /\bLTD\.?\s*ŞT[İIİi]\.?\b/gi,
  /\bLTD\.?\s*ST[İIİi]\.?\b/gi,
  /\bA\.?\s*Ş\.?\b/gi,
  /\bA\.?\s*S\.?\b/gi,
  /\bANON[İIİi]M\s*Ş[İIİi]RKET[İIİi]\b/gi,
  /\bŞ[İIİi]RKET[İIİi]\b/gi,
];

const NOISE_SEGMENT_RE =
  /\b(?:GIDA|T[İIİi]CARET|MAĞAZACILIK|MAGazACILIK|T[İIİi]C\.?|SAN\.?|PAZARLAMA|DAĞITIM|DAGITIM|LOJ[İIİi]ST[İIİi]K|H[İIİi]ZMETLER[İIİi]|GRUP|GROUP)\b/gi;

const LOCATION_PREFIX_RE =
  /^[A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9a-zçğıöşü.\- ]+\/\s*[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü.\- ]+\s+/i;

const CHAIN_HINTS: ReadonlyArray<{ pattern: RegExp; display: string }> = [
  { pattern: /\b5m\s*migros\b/i, display: "5M Migros" },
  { pattern: /\btiki\s*beach\b/i, display: "Tiki Beach" },
  { pattern: /\balt[ıi]nk[ıi]l[ıi][çc]lar\s*kahve\b/i, display: "Altınkılıçlar Kahve" },
  { pattern: /\bçehre\s*g[ıi]da\b/i, display: "Çehre Gıda" },
  { pattern: /\bçehre\b/i, display: "Çehre Gıda" },
  { pattern: /\bşengül\s*hediyelik\b/i, display: "Şengül Hediyelik" },
  { pattern: /\bözy[ıi]ld[ıi]z\s*petrol\b/i, display: "Özyıldız Petrol" },
  { pattern: /\bpetrol\s*of[ıi]s[ıi]\b/i, display: "Petrol Ofisi" },
  { pattern: /\bfile\s*market\b/i, display: "File Market" },
  { pattern: /\bf[İI]le\s*market\b/i, display: "File Market" },
  { pattern: /\bmigros\b/i, display: "Migros" },
  { pattern: /\bb[İI]m\b/i, display: "BİM" },
  { pattern: /\ba101\b/i, display: "A101" },
  { pattern: /\bcarrefour\s*sa\b/i, display: "CarrefourSA" },
];

function titleCaseTr(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[A-Z0-9]{2,5}$/.test(word)) return word;
      return (
        word.charAt(0).toLocaleUpperCase("tr-TR") +
        word.slice(1).toLocaleLowerCase("tr-TR")
      );
    })
    .join(" ");
}

function detectChainName(text: string): string | null {
  for (const hint of CHAIN_HINTS) {
    if (hint.pattern.test(text)) return hint.display;
  }
  return null;
}

const LEGAL_BLOCK_TAIL =
  /\s+SAN\.?\s*VE\s*T[İI]C\.?\s*(?:LTD\.?\s*)?(?:ŞT[İI]\.?|STI\.?)\s*\.?\s*$/gi;

function stripLegalAndNoise(value: string): string {
  let s = value.replace(NOISE_SEGMENT_RE, " ");
  for (let pass = 0; pass < 4; pass++) {
    let next = s.replace(LEGAL_BLOCK_TAIL, "");
    for (const pattern of LEGAL_SUFFIX_PATTERNS) {
      next = next.replace(pattern, " ");
    }
    next = next
      .replace(CORPORATE_SUFFIX, " ")
      .replace(
        /\s+(?:SAN\.?\s*VE\s*)?(?:T[İI]C\.?\s*)?(?:LTD\.?\s*)?(?:ŞT[İI]\.?|STI\.?)\s*\.?\s*$/gi,
        ""
      )
      .replace(/\s+\.\s*VE\s*$/gi, "")
      .replace(/\s+\.\s*$/g, "")
      .replace(/[.,;:/\\-]+\s*$/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (next === s) break;
    s = next;
  }
  return s.trim();
}

function compactRestaurantName(value: string): string {
  if (!/\brestoran\b/i.test(value) && !/\brestaurant\b/i.test(value)) {
    return value;
  }
  const withoutGroup = value.replace(/\b(?:grup|group)\b/gi, " ");
  return withoutGroup.replace(/\s{2,}/g, " ").trim();
}

/**
 * Strip legal suffixes, address glue, and OCR noise from merchant titles.
 * VKN/TCKN must be passed separately — this never strips digit-only tax ids.
 */
export function cleanMerchantName(raw: string | null | undefined): string {
  if (!raw) return "";
  let name = raw.replace(/\u00a0/g, " ").trim();
  if (!name) return "";

  const chain = detectChainName(name);
  if (chain) return chain;

  name = truncateMerchantTitle(name);
  name = name.replace(LOCATION_PREFIX_RE, "");
  if (isTaxOfficeLine(name)) {
    return titleCaseTr(name.replace(/\bvd\.?\b/gi, "").trim());
  }

  name = stripLegalAndNoise(name);
  name = compactRestaurantName(name);
  name = name.replace(/[,;:/\\-]+\s*$/g, "").trim();

  if (!name) return titleCaseTr(raw.trim());
  return titleCaseTr(name);
}
