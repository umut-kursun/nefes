import type { FieldConfidence } from "../types";

export type MerchantFingerprint = {
  readonly id: string;
  readonly patterns: readonly RegExp[];
  readonly weight: number;
  readonly profileHint?: import("../types").ReceiptProfile;
};

/** Probabilistic merchant fingerprints â€” scored, not keyword-only. */
export const MERCHANT_FINGERPRINTS: readonly MerchantFingerprint[] = Object.freeze([
  { id: "migros", patterns: [/\bmigros\b/i, /\bticaret\s+a\.?\s*ÅŸ/i], weight: 1, profileHint: "market" },
  { id: "carrefoursa", patterns: [/\bcarrefoursa\b/i, /\bcarrefour\b/i], weight: 0.95, profileHint: "market" },
  { id: "a101", patterns: [/\ba101\b/i, /\byapi\s*market\b/i], weight: 0.95, profileHint: "market" },
  { id: "bim", patterns: [/\bbim\b/i, /\bbirlesik\s*magazalar\b/i], weight: 0.95, profileHint: "market" },
  { id: "sok", patterns: [/\bsok\b/i, /\bÅŸok\b/i, /\bsok\s*marketler\b/i], weight: 0.9, profileHint: "market" },
  { id: "macrocenter", patterns: [/\bmacrocenter\b/i], weight: 0.9, profileHint: "market" },
  { id: "shell", patterns: [/\bshell\b/i, /\bturcas\s*petrol\b/i], weight: 1, profileHint: "fuel" },
  { id: "opet", patterns: [/\bopet\b/i, /\bpetrolculuk\b/i], weight: 1, profileHint: "fuel" },
  { id: "bp", patterns: [/\bbp\b/i, /\bakaryakit\b/i], weight: 0.9, profileHint: "fuel" },
  { id: "petrol-ofisi", patterns: [/\bpetrol\s*ofisi\b/i], weight: 1, profileHint: "fuel" },
  { id: "starbucks", patterns: [/\bstarbucks\b/i], weight: 1, profileHint: "cafe" },
  { id: "burger-king", patterns: [/\bburger\s*king\b/i], weight: 1, profileHint: "restaurant" },
  { id: "lcw", patterns: [/\blc\s*waikiki\b/i, /\bwaikiki\b/i], weight: 1 },
  { id: "toyzz", patterns: [/\btoyzz\b/i], weight: 0.9, profileHint: "pos-slip" },
  { id: "eczane", patterns: [/\beczane\b/i], weight: 0.85 },
  { id: "ispark", patterns: [/\bispark\b/i, /\botopark\b/i], weight: 0.85 },
  { id: "ogs", patterns: [/\bogs\b/i, /\bhgs\b/i], weight: 0.85 },
]);

export type MerchantScore = {
  readonly id: string;
  readonly score: number;
  readonly profileHint?: import("../types").ReceiptProfile;
};

function compactMerchantText(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}

export function scoreMerchantFingerprints(text: string): MerchantScore[] {
  const compact = compactMerchantText(text);
  const scores: MerchantScore[] = [];
  for (const fp of MERCHANT_FINGERPRINTS) {
    let hits = 0;
    for (const pat of fp.patterns) {
      if (pat.test(text) || pat.test(compact)) hits += 1;
    }
    if (hits > 0) {
      scores.push({
        id: fp.id,
        score: Math.min(1, (hits / fp.patterns.length) * fp.weight),
        profileHint: fp.profileHint,
      });
    }
  }
  return scores.sort((a, b) => b.score - a.score);
}

export function merchantConfidenceFromScores(scores: MerchantScore[]): FieldConfidence {
  if (scores.length === 0) return { value: 0.2, reasons: ["no_fingerprint_match"] };
  const top = scores[0]!;
  return {
    value: top.score,
    reasons: [`fingerprint:${top.id}`, `score:${top.score.toFixed(2)}`],
  };
}

