import type { GoldenExpectedPurchase } from "../fixtures/golden/types";
import type { NormalizedPurchase, ReceiptProfile } from "../types";
import type { PipelineResult } from "../pipeline/run";

export type FieldScore = {
  readonly ok: boolean;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly confidence?: number;
};

export type FixtureFieldMetrics = {
  readonly merchant: FieldScore;
  readonly date: FieldScore;
  readonly receiptNumber: FieldScore;
  readonly payment: FieldScore;
  readonly product: FieldScore;
  readonly total: FieldScore;
  readonly profile: FieldScore;
  readonly forbiddenProducts: FieldScore;
};

export type FixtureMetrics = {
  readonly slug: string;
  readonly label: string;
  readonly category: string;
  readonly runtimeMs: number;
  readonly averageConfidence: number;
  readonly fields: FixtureFieldMetrics;
  readonly passed: boolean;
  readonly failures: readonly string[];
};

export type MetricsDashboard = {
  readonly generatedAt: string;
  readonly fixtureCount: number;
  readonly passedCount: number;
  readonly failedCount: number;
  readonly merchantAccuracy: number;
  readonly dateAccuracy: number;
  readonly receiptNumberAccuracy: number;
  readonly paymentAccuracy: number;
  readonly productAccuracy: number;
  readonly totalAccuracy: number;
  readonly profileAccuracy: number;
  readonly forbiddenProductAccuracy: number;
  readonly averageConfidence: number;
  readonly averageRuntimeMs: number;
  readonly fixtures: readonly FixtureMetrics[];
};

const AMOUNT_EPS = 0.02;

function avgConfidence(purchase: NormalizedPurchase): number {
  const scores = [
    purchase.merchantConfidence.value,
    purchase.dateConfidence.value,
    purchase.receiptNumberConfidence.value,
    ...purchase.products.map((p) => p.confidence.value),
    ...purchase.payments.map((p) => p.confidence.value),
    purchase.total?.confidence.value ?? 0,
  ].filter((v) => v > 0);
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function matchString(
  actual: string | null | undefined,
  expected: string | null | undefined,
  mode: "exact" | "contains" = "contains"
): boolean {
  if (expected == null) return true;
  if (actual == null) return false;
  const a = actual.toLowerCase();
  const e = expected.toLowerCase();
  return mode === "exact" ? a === e : a.includes(e);
}

function amountsClose(a?: number, b?: number): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= AMOUNT_EPS;
}

function evaluateProducts(
  actual: NormalizedPurchase,
  expected: GoldenExpectedPurchase
): FieldScore {
  if (expected.productCount != null && actual.products.length !== expected.productCount) {
    return {
      ok: false,
      expected: expected.productCount,
      actual: actual.products.length,
    };
  }

  if (!expected.products?.length) {
    return { ok: true, expected: null, actual: actual.products.length };
  }

  const allMatch = expected.products.every((exp) => {
    const found = actual.products.find((p) => {
      const mode = exp.nameMatch ?? "contains";
      const nameOk =
        mode === "exact"
          ? p.name.toLowerCase() === exp.name.toLowerCase()
          : p.name.toLowerCase().includes(exp.name.toLowerCase());
      const totalOk = exp.lineTotal == null || amountsClose(p.lineTotal, exp.lineTotal);
      const qtyOk = exp.quantity == null || amountsClose(p.quantity, exp.quantity);
      const unitOk = exp.unit == null || p.unit === exp.unit;
      return nameOk && totalOk && qtyOk && unitOk;
    });
    return Boolean(found);
  });

  return {
    ok: allMatch,
    expected: expected.products.map((p) => p.name),
    actual: actual.products.map((p) => p.name),
  };
}

function evaluatePayments(
  actual: NormalizedPurchase,
  expected: GoldenExpectedPurchase
): FieldScore {
  if (!expected.payments?.length) {
    return { ok: true, expected: null, actual: actual.payments.length };
  }
  const allMatch = expected.payments.every((exp) => {
    const found = actual.payments.find((p) => {
      const mode = exp.labelMatch ?? "contains";
      const labelOk =
        mode === "exact"
          ? p.label.toLowerCase() === exp.label.toLowerCase()
          : p.label.toLowerCase().includes(exp.label.toLowerCase());
      const amtOk = exp.amount == null || amountsClose(p.amount, exp.amount);
      return labelOk && amtOk;
    });
    return Boolean(found);
  });
  return {
    ok: allMatch,
    expected: expected.payments.map((p) => p.label),
    actual: actual.payments.map((p) => p.label),
  };
}

function evaluateForbidden(
  actual: NormalizedPurchase,
  expected: GoldenExpectedPurchase
): FieldScore {
  const patterns = expected.forbiddenProductPatterns ?? [];
  if (patterns.length === 0) return { ok: true, expected: [], actual: [] };
  const hits = actual.products.filter((p) =>
    patterns.some((pat) => new RegExp(pat, "i").test(p.name))
  );
  return {
    ok: hits.length === 0,
    expected: patterns,
    actual: hits.map((h) => h.name),
  };
}

export function evaluateFixture(
  slug: string,
  label: string,
  category: string,
  expected: GoldenExpectedPurchase,
  result: PipelineResult,
  runtimeMs: number
): FixtureMetrics {
  const { purchase } = result;
  const failures: string[] = [];

  const merchantMode = expected.merchantMatch ?? "contains";
  const merchantOk = matchString(purchase.merchant, expected.merchant ?? undefined, merchantMode);
  if (!merchantOk && expected.merchant) failures.push("merchant");

  const dateOk =
    expected.purchaseDate == null || purchase.purchaseDate === expected.purchaseDate;
  if (!dateOk) failures.push("date");

  const receiptOk =
    expected.receiptNumber == null || purchase.receiptNumber === expected.receiptNumber;
  if (!receiptOk) failures.push("receiptNumber");

  const productScore = evaluateProducts(purchase, expected);
  if (!productScore.ok) failures.push("product");

  const paymentScore = evaluatePayments(purchase, expected);
  if (!paymentScore.ok) failures.push("payment");

  const totalOk =
    expected.total == null || amountsClose(purchase.total?.amount, expected.total);
  if (!totalOk) failures.push("total");

  const profileOk = expected.profile == null || purchase.profile === expected.profile;
  if (!profileOk) failures.push("profile");

  const forbiddenScore = evaluateForbidden(purchase, expected);
  if (!forbiddenScore.ok) failures.push("forbiddenProduct");

  const fields: FixtureFieldMetrics = {
    merchant: {
      ok: merchantOk,
      expected: expected.merchant,
      actual: purchase.merchant,
      confidence: purchase.merchantConfidence.value,
    },
    date: {
      ok: dateOk,
      expected: expected.purchaseDate,
      actual: purchase.purchaseDate,
      confidence: purchase.dateConfidence.value,
    },
    receiptNumber: {
      ok: receiptOk,
      expected: expected.receiptNumber,
      actual: purchase.receiptNumber,
      confidence: purchase.receiptNumberConfidence.value,
    },
    payment: {
      ...paymentScore,
      confidence:
        purchase.payments[0]?.confidence.value ??
        purchase.total?.confidence.value ??
        0,
    },
    product: productScore,
    total: {
      ok: totalOk,
      expected: expected.total,
      actual: purchase.total?.amount,
      confidence: purchase.total?.confidence.value,
    },
    profile: {
      ok: profileOk,
      expected: expected.profile,
      actual: purchase.profile,
    },
    forbiddenProducts: forbiddenScore,
  };

  return {
    slug,
    label,
    category,
    runtimeMs,
    averageConfidence: avgConfidence(purchase),
    fields,
    passed: failures.length === 0,
    failures,
  };
}

function accuracy(values: readonly boolean[]): number {
  if (values.length === 0) return 1;
  return values.filter(Boolean).length / values.length;
}

export function aggregateMetrics(fixtures: readonly FixtureMetrics[]): MetricsDashboard {
  const passedCount = fixtures.filter((f) => f.passed).length;
  return {
    generatedAt: new Date().toISOString(),
    fixtureCount: fixtures.length,
    passedCount,
    failedCount: fixtures.length - passedCount,
    merchantAccuracy: accuracy(fixtures.map((f) => f.fields.merchant.ok)),
    dateAccuracy: accuracy(fixtures.map((f) => f.fields.date.ok)),
    receiptNumberAccuracy: accuracy(fixtures.map((f) => f.fields.receiptNumber.ok)),
    paymentAccuracy: accuracy(fixtures.map((f) => f.fields.payment.ok)),
    productAccuracy: accuracy(fixtures.map((f) => f.fields.product.ok)),
    totalAccuracy: accuracy(fixtures.map((f) => f.fields.total.ok)),
    profileAccuracy: accuracy(fixtures.map((f) => f.fields.profile.ok)),
    forbiddenProductAccuracy: accuracy(fixtures.map((f) => f.fields.forbiddenProducts.ok)),
    averageConfidence:
      fixtures.reduce((s, f) => s + f.averageConfidence, 0) / Math.max(1, fixtures.length),
    averageRuntimeMs:
      fixtures.reduce((s, f) => s + f.runtimeMs, 0) / Math.max(1, fixtures.length),
    fixtures,
  };
}

export function formatMetricsDashboard(dashboard: MetricsDashboard): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const lines = [
    "═══════════════════════════════════════════════════",
    "  Receipt Engine V3 — Metrics Dashboard",
    "═══════════════════════════════════════════════════",
    `Fixtures: ${dashboard.passedCount}/${dashboard.fixtureCount} passed`,
    `Merchant accuracy:     ${pct(dashboard.merchantAccuracy)}`,
    `Date accuracy:         ${pct(dashboard.dateAccuracy)}`,
    `Receipt # accuracy:    ${pct(dashboard.receiptNumberAccuracy)}`,
    `Payment accuracy:      ${pct(dashboard.paymentAccuracy)}`,
    `Product accuracy:      ${pct(dashboard.productAccuracy)}`,
    `Total accuracy:        ${pct(dashboard.totalAccuracy)}`,
    `Profile accuracy:      ${pct(dashboard.profileAccuracy)}`,
    `Forbidden product OK:  ${pct(dashboard.forbiddenProductAccuracy)}`,
    `Avg confidence:        ${(dashboard.averageConfidence * 100).toFixed(1)}%`,
    `Avg runtime:           ${dashboard.averageRuntimeMs.toFixed(2)} ms`,
    "───────────────────────────────────────────────────",
  ];

  for (const f of dashboard.fixtures.filter((x) => !x.passed)) {
    lines.push(`FAIL ${f.slug}: ${f.failures.join(", ")}`);
  }

  lines.push("═══════════════════════════════════════════════════");
  return lines.join("\n");
}

export function profileFromCategory(category: string): ReceiptProfile {
  const map: Record<string, ReceiptProfile> = {
    market: "market",
    fuel: "fuel",
    restaurant: "restaurant",
    cafe: "cafe",
    pharmacy: "generic",
    hardware: "generic",
    clothing: "generic",
    parking: "generic",
    toll: "generic",
    taxi: "generic",
    "pos-slip": "pos-slip",
    "e-arsiv": "e-arsiv",
  };
  return map[category] ?? "generic";
}
