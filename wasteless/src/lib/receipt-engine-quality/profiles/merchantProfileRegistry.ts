import type { LayoutProfile } from "@/lib/receipt-engine/config/profiles";
import { clampConfidence } from "@/lib/receipt-engine/types/provenance";

/** Optional merchant layout profile — confidence boost only, never required. */
export interface MerchantLayoutProfile extends LayoutProfile {
  readonly merchantPatterns: readonly RegExp[];
  readonly confidenceBoost: number;
}

export interface MerchantProfileRegistry {
  list(): readonly MerchantLayoutProfile[];
  findMatch(rawText: string): MerchantLayoutProfile | null;
  applyConfidenceBoost(
    baseConfidence: number,
    rawText: string
  ): number;
}

export function createMerchantProfileRegistry(
  profiles: readonly MerchantLayoutProfile[] = []
): MerchantProfileRegistry {
  return {
    list: () => profiles,
    findMatch(rawText: string) {
      for (const profile of profiles) {
        if (profile.merchantPatterns.some((p) => p.test(rawText))) {
          return profile;
        }
      }
      return null;
    },
    applyConfidenceBoost(baseConfidence: number, rawText: string) {
      const match = this.findMatch(rawText);
      if (!match) return baseConfidence;
      return clampConfidence(baseConfidence + match.confidenceBoost);
    },
  };
}

/** Default registry — empty; parser uses generic-tr without profiles. */
export const defaultMerchantProfileRegistry =
  createMerchantProfileRegistry();
