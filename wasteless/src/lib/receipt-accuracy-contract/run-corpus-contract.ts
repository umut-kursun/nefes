import {
  CORPUS_RECEIPT_IDS,
  type CorpusReceiptId,
  type CorpusScorecard,
} from "./types";
import { getGroundTruth } from "./ground-truth";
import { evaluateContractReport } from "./evaluate";
import { buildScorecard } from "./scorecard";
import {
  runFrozenBaselineSnapshot,
  runTierAReplay,
  loadFrozenBaselineSummary,
} from "./pipeline-snapshot";

export type CorpusContractTier = "frozen-baseline" | "tier-a-replay";

export function runCorpusContractEvaluation(
  tier: CorpusContractTier
): CorpusScorecard {
  const snapshots = CORPUS_RECEIPT_IDS.map((id) => {
    if (tier === "frozen-baseline") {
      return runFrozenBaselineSnapshot(id);
    }
    return runTierAReplay(id).snapshot;
  });

  const reports = snapshots.map((snap) =>
    evaluateContractReport(snap, getGroundTruth(snap.id))
  );

  return buildScorecard({
    phase: "phase-0",
    tier: tier === "frozen-baseline" ? "frozen-baseline" : "tier-a-replay",
    reports,
    snapshots,
  });
}

export function compareAnalysisStatusToBaseline(
  tier: CorpusContractTier
): { id: CorpusReceiptId; baseline: string; actual: string; match: boolean }[] {
  return CORPUS_RECEIPT_IDS.map((id) => {
    const baseline = loadFrozenBaselineSummary(id);
    const snap =
      tier === "frozen-baseline"
        ? runFrozenBaselineSnapshot(id)
        : runTierAReplay(id).snapshot;
    return {
      id,
      baseline: baseline.analysisStatus,
      actual: snap.analysisStatus,
      match: baseline.analysisStatus === snap.analysisStatus,
    };
  });
}
