import type { GoldenFieldStatus } from "../tests/golden/runGoldenSuite";
import { compareGoldenPurchase } from "../tests/golden/runGoldenSuite";
import type { GoldenExpectation } from "../tests/golden/GoldenExpectation";
import type { BenchmarkEngineOutput } from "./normalizeOutputs";
import {
  goldenDiscountTotal,
  v1DiscountTotal,
  v2DiscountTotal,
} from "./normalizeOutputs";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";

export type BenchmarkCategory =
  | "merchant"
  | "metadata"
  | "products"
  | "discounts"
  | "payments"
  | "footer"
  | "validation";

export type BenchmarkCategoryScore = {
  readonly category: BenchmarkCategory;
  readonly score: number;
  readonly maxScore: number;
  readonly checks: number;
  readonly passed: number;
};

export type BenchmarkComparisonRank = "better" | "same" | "worse";

export type BenchmarkCategoryComparison = {
  readonly category: BenchmarkCategory;
  readonly v1Score: number;
  readonly v2Score: number;
  readonly rank: BenchmarkComparisonRank;
};

const CATEGORY_PATHS: Record<BenchmarkCategory, readonly RegExp[]> = {
  merchant: [/^merchant$/],
  metadata: [/^purchaseDate$/, /^purchaseTime$/, /^receiptNumber$/, /^currency$/],
  products: [/^productCount$/, /^product\[\d+\]\./],
  discounts: [/discount/],
  payments: [/^payment/, /^footer\.payment/],
  footer: [/^footer\.(subtotal|total|vatTotal)$/, /^total$/, /^vatTotal$/],
  validation: [],
};

function scoreFromStatuses(
  statuses: readonly GoldenFieldStatus[],
  patterns: readonly RegExp[],
  category: BenchmarkCategory
): BenchmarkCategoryScore {
  const matched = statuses.filter((status) =>
    patterns.some((pattern) => pattern.test(status.path))
  );

  if (matched.length === 0) {
    return { category, score: 10, maxScore: 10, checks: 0, passed: 0 };
  }

  const passed = matched.filter((status) => status.ok).length;
  const ratio = passed / matched.length;

  return {
    category,
    score: Math.round(ratio * 10 * 10) / 10,
    maxScore: 10,
    checks: matched.length,
    passed,
  };
}

function scoreValidation(
  output: BenchmarkEngineOutput,
  goldenStatuses: readonly GoldenFieldStatus[]
): BenchmarkCategoryScore {
  if (output.validationScore != null) {
    return {
      category: "validation",
      score: Math.round((output.validationScore / 10) * 10) / 10,
      maxScore: 10,
      checks: 1,
      passed: output.validationIsValid ? 1 : 0,
    };
  }

  const structural = goldenStatuses.filter((status) =>
    /^(productCount|total|vatTotal|footer\.total|footer\.vatTotal)$/.test(status.path)
  );

  if (structural.length === 0) {
    return {
      category: "validation",
      score: 10,
      maxScore: 10,
      checks: 0,
      passed: 0,
    };
  }

  const passed = structural.filter((status) => status.ok).length;
  const ratio = passed / structural.length;

  return {
    category: "validation",
    score: Math.round(ratio * 10 * 10) / 10,
    maxScore: 10,
    checks: structural.length,
    passed,
  };
}

function scoreDiscountsAgainstGolden(
  actualTotal: number,
  golden: GoldenExpectation
): BenchmarkCategoryScore {
  const expected = goldenDiscountTotal(golden);

  if (expected === 0 && actualTotal === 0) {
    return {
      category: "discounts",
      score: 10,
      maxScore: 10,
      checks: 1,
      passed: 1,
    };
  }

  if (expected === 0) {
    return {
      category: "discounts",
      score: actualTotal === 0 ? 10 : 0,
      maxScore: 10,
      checks: 1,
      passed: actualTotal === 0 ? 1 : 0,
    };
  }

  const ratio = Math.max(0, 1 - Math.abs(actualTotal - expected) / Math.abs(expected));

  return {
    category: "discounts",
    score: Math.round(ratio * 10 * 10) / 10,
    maxScore: 10,
    checks: 1,
    passed: ratio >= 0.99 ? 1 : 0,
  };
}

export function scoreEngineAgainstGolden(
  output: BenchmarkEngineOutput,
  golden: GoldenExpectation,
  v1Draft?: PurchaseDraft
): BenchmarkCategoryScore[] {
  const statuses = compareGoldenPurchase(output.purchase, golden);
  const categories: BenchmarkCategory[] = [
    "merchant",
    "metadata",
    "products",
    "payments",
    "footer",
  ];

  const scores: BenchmarkCategoryScore[] = categories.map((category) =>
    scoreFromStatuses(statuses, CATEGORY_PATHS[category], category)
  );

  const discountTotal =
    v1Draft != null ? v1DiscountTotal(v1Draft) : v2DiscountTotal(output.purchase);

  scores.push({
    ...scoreDiscountsAgainstGolden(discountTotal, golden),
    category: "discounts",
  });

  scores.push(scoreValidation(output, statuses));

  return scores;
}

export function compareCategoryScores(
  v1Scores: readonly BenchmarkCategoryScore[],
  v2Scores: readonly BenchmarkCategoryScore[]
): BenchmarkCategoryComparison[] {
  const v2ByCategory = new Map(v2Scores.map((score) => [score.category, score]));

  return v1Scores.map((v1Score) => {
    const v2Score = v2ByCategory.get(v1Score.category);
    const v2Value = v2Score?.score ?? 0;
    let rank: BenchmarkCategoryComparison["rank"] = "same";
    if (v2Value > v1Score.score + 0.05) rank = "better";
    else if (v1Score.score > v2Value + 0.05) rank = "worse";

    return {
      category: v1Score.category,
      v1Score: v1Score.score,
      v2Score: v2Value,
      rank,
    };
  });
}

export function overallScore(scores: readonly BenchmarkCategoryScore[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((total, score) => total + score.score, 0);
  return Math.round((sum / (scores.length * 10)) * 100);
}

export function averageCategoryScore(
  results: readonly { v1Scores: readonly BenchmarkCategoryScore[]; v2Scores: readonly BenchmarkCategoryScore[] }[],
  category: BenchmarkCategory,
  engine: "v1" | "v2"
): number {
  const values = results
    .map((result) => {
      const scores = engine === "v1" ? result.v1Scores : result.v2Scores;
      return scores.find((score) => score.category === category)?.score;
    })
    .filter((value): value is number => value != null);

  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}
