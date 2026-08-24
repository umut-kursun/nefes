export type {
  ContractReport,
  CorpusReceiptId,
  CorpusScorecard,
  FieldVerdict,
  PipelineTimings,
  ReceiptPipelineSnapshot,
} from "./types";

export {
  CORPUS_RECEIPT_IDS,
} from "./types";

export {
  RECEIPT_GROUND_TRUTH,
  getGroundTruth,
  type ReceiptGroundTruth,
} from "./ground-truth";

export {
  PRODUCT_POLLUTION_PATTERN,
  isPollutedProductName,
  containsFolded,
  foldTr,
} from "./patterns";

export { evaluateContractReport } from "./evaluate";

export { buildScorecard, formatScorecardMarkdown } from "./scorecard";

export {
  loadCachedLiveOcr,
  visionFromCachedOcr,
  runTierAReplay,
  runFrozenBaselineSnapshot,
  loadFrozenBaselineSummary,
  loadFrozenPurchaseDraft,
  pipelineSnapshotFromDraftBundle,
} from "./pipeline-snapshot";

export { runCorpusContractEvaluation, compareAnalysisStatusToBaseline } from "./run-corpus-contract";
export type { CorpusContractTier } from "./run-corpus-contract";
