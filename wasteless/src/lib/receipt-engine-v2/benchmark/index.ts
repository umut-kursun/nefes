export {
  goldenDiscountTotal,
  purchaseDraftToPurchase,
  receiptEngineV2ResultToPurchase,
  v1DiscountTotal,
  v2DiscountTotal,
  wrapV1Output,
  wrapV2Output,
} from "./normalizeOutputs";

export type { BenchmarkEngineOutput, BenchmarkRunMetrics } from "./normalizeOutputs";

export {
  averageCategoryScore,
  compareCategoryScores,
  overallScore,
  scoreEngineAgainstGolden,
} from "./scoreCategory";

export type {
  BenchmarkCategory,
  BenchmarkCategoryComparison,
  BenchmarkCategoryScore,
  BenchmarkComparisonRank,
} from "./scoreCategory";

export { benchmarkGoldenReceipt, runBenchmark } from "./runBenchmark";

export type {
  BenchmarkPerformanceSummary,
  BenchmarkReceiptResult,
  BenchmarkReport,
} from "./runBenchmark";

export { formatBenchmarkMarkdown } from "./formatMarkdownReport";
