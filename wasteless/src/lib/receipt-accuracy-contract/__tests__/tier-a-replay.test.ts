import { describe, expect, it } from "vitest";
import {
  compareAnalysisStatusToBaseline,
  runCorpusContractEvaluation,
  runTierAReplay,
} from "@/lib/receipt-accuracy-contract";

describe("tier-a replay harness", () => {
  it("replays cached OCR for all corpus receipts without error", () => {
    const scorecard = runCorpusContractEvaluation("tier-a-replay");
    expect(scorecard.reports).toHaveLength(9);
    expect(scorecard.latency.samples).toHaveLength(9);
  });

  it("tier-a replay status comparison covers all corpus receipts", () => {
    const rows = compareAnalysisStatusToBaseline("tier-a-replay");
    expect(rows).toHaveLength(9);
    // Tier-a replays cached OCR through current V2 only. Frozen baseline may differ
    // for V1-fallback captures (B,C) or live-path drift. Tier-b-live status sanity
    // is validated by `npm run corpus:contract:live`, not this deterministic tier.
  });

  it("individual replay completes in under 500ms (deterministic only)", () => {
    const { snapshot } = runTierAReplay("D");
    expect(snapshot.timings.totalMs).toBeLessThan(500);
    expect(snapshot.tier).toBe("tier-a-replay");
  });
});
