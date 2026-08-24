import { runReceiptEngineV2 } from "../../engine/runReceiptEngineV2";
import type { Purchase } from "../../engine/types";
import type { FooterPayment } from "../../footer/FooterData";
import type { ParsedProduct } from "../../parser/ParsedProduct";
import {
  buildVisionResult,
  loadAllGoldenReceipts,
  type GoldenReceipt,
} from "./GoldenReceipt";
import type {
  GoldenExpectedFooter,
  GoldenExpectedPayment,
  GoldenExpectedProduct,
  GoldenExpectation,
} from "./GoldenExpectation";

export type GoldenFieldStatus = {
  readonly path: string;
  readonly ok: boolean;
  readonly expected?: unknown;
  readonly actual?: unknown;
};

export type GoldenReceiptResult = {
  readonly slug: string;
  readonly label: string;
  readonly passed: boolean;
  readonly statuses: readonly GoldenFieldStatus[];
  readonly diffs: readonly GoldenFieldStatus[];
  readonly report: string;
};

export type GoldenSuiteResult = {
  readonly passed: boolean;
  readonly receiptCount: number;
  readonly passedCount: number;
  readonly failedCount: number;
  readonly results: readonly GoldenReceiptResult[];
  readonly report: string;
};

function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function valuesEqual(expected: unknown, actual: unknown): boolean {
  if (Object.is(expected, actual)) return true;
  if (expected == null && actual == null) return true;
  return false;
}

function recordField(
  statuses: GoldenFieldStatus[],
  path: string,
  expected: unknown,
  actual: unknown
): void {
  statuses.push({
    path,
    ok: valuesEqual(expected, actual),
    expected,
    actual,
  });
}

function compareOptionalField(
  statuses: GoldenFieldStatus[],
  path: string,
  expected: unknown | undefined,
  actual: unknown
): void {
  if (expected === undefined) return;
  recordField(statuses, path, expected, actual);
}

function compareProductDiscounts(
  statuses: GoldenFieldStatus[],
  index: number,
  actual: ParsedProduct,
  expected: GoldenExpectedProduct
): void {
  if (expected.discount !== undefined) {
    const actualDiscount = actual.discounts[0]?.amount ?? null;
    recordField(statuses, `product[${index}].discount`, expected.discount, actualDiscount);
  }

  if (expected.discounts !== undefined) {
    compareOptionalField(
      statuses,
      `product[${index}].discountCount`,
      expected.discounts.length,
      actual.discounts.length
    );

    for (let discountIndex = 0; discountIndex < expected.discounts.length; discountIndex++) {
      const expectedDiscount = expected.discounts[discountIndex];
      const actualDiscount = actual.discounts[discountIndex];
      const prefix = `product[${index}].discount[${discountIndex}]`;

      compareOptionalField(
        statuses,
        `${prefix}.amount`,
        expectedDiscount?.amount,
        actualDiscount?.amount ?? null
      );
      compareOptionalField(
        statuses,
        `${prefix}.rawText`,
        expectedDiscount?.rawText,
        actualDiscount?.rawText ?? null
      );
    }
  }
}

function compareProduct(
  statuses: GoldenFieldStatus[],
  index: number,
  actual: ParsedProduct | undefined,
  expected: GoldenExpectedProduct
): void {
  const prefix = `product[${index}]`;

  compareOptionalField(statuses, `${prefix}.rawName`, expected.rawName, actual?.rawName ?? null);
  compareOptionalField(
    statuses,
    `${prefix}.quantity`,
    expected.quantity,
    actual?.quantity ?? null
  );
  compareOptionalField(statuses, `${prefix}.unit`, expected.unit, actual?.unit ?? null);
  compareOptionalField(
    statuses,
    `${prefix}.unitPrice`,
    expected.unitPrice,
    actual?.unitPrice ?? null
  );
  compareOptionalField(
    statuses,
    `${prefix}.lineTotal`,
    expected.lineTotal,
    actual?.lineTotal ?? null
  );
  compareOptionalField(
    statuses,
    `${prefix}.vatRate`,
    expected.vatRate,
    actual?.vatRate ?? null
  );

  if (actual) {
    compareProductDiscounts(statuses, index, actual, expected);
  }
}

function comparePayment(
  statuses: GoldenFieldStatus[],
  path: string,
  actual: FooterPayment | null | undefined,
  expected: GoldenExpectedPayment | null | undefined
): void {
  if (expected === undefined) return;

  if (expected === null) {
    recordField(statuses, path, null, actual ?? null);
    return;
  }

  compareOptionalField(statuses, `${path}.type`, expected.type, actual?.type ?? null);
  compareOptionalField(statuses, `${path}.amount`, expected.amount, actual?.amount ?? null);
  compareOptionalField(
    statuses,
    `${path}.rawLabel`,
    expected.rawLabel,
    actual?.rawLabel ?? null
  );
}

function compareFooter(
  statuses: GoldenFieldStatus[],
  actual: Purchase["footer"],
  expected: GoldenExpectedFooter | undefined
): void {
  if (!expected) return;

  compareOptionalField(statuses, "footer.subtotal", expected.subtotal, actual.subtotal);
  compareOptionalField(statuses, "footer.total", expected.total, actual.total);
  compareOptionalField(statuses, "footer.vatTotal", expected.vatTotal, actual.vatTotal);

  if (expected.payments !== undefined) {
    compareOptionalField(
      statuses,
      "footer.paymentCount",
      expected.payments.length,
      actual.payments.length
    );

    for (let index = 0; index < expected.payments.length; index++) {
      comparePayment(
        statuses,
        `footer.payment[${index}]`,
        actual.payments[index],
        expected.payments[index]
      );
    }
  }
}

/** Compare a purchase against a golden expectation without stopping at the first mismatch. */
export function compareGoldenPurchase(
  actual: Purchase,
  expected: GoldenExpectation
): GoldenFieldStatus[] {
  const statuses: GoldenFieldStatus[] = [];

  compareOptionalField(
    statuses,
    "merchant",
    expected.merchant,
    actual.merchant.rawName
  );
  compareOptionalField(
    statuses,
    "purchaseDate",
    expected.purchaseDate,
    actual.metadata.purchaseDate
  );
  compareOptionalField(
    statuses,
    "purchaseTime",
    expected.purchaseTime,
    actual.metadata.purchaseTime
  );
  compareOptionalField(
    statuses,
    "receiptNumber",
    expected.receiptNumber,
    actual.metadata.receiptNumber
  );
  compareOptionalField(
    statuses,
    "currency",
    expected.currency,
    actual.metadata.currency
  );
  compareOptionalField(
    statuses,
    "productCount",
    expected.productCount,
    actual.products.length
  );
  compareOptionalField(statuses, "total", expected.total, actual.footer.total);
  compareOptionalField(statuses, "vatTotal", expected.vatTotal, actual.footer.vatTotal);
  comparePayment(statuses, "payment", actual.footer.payments[0], expected.payment);

  if (expected.products !== undefined) {
    for (let index = 0; index < expected.products.length; index++) {
      compareProduct(statuses, index, actual.products[index], expected.products[index]!);
    }
  }

  compareFooter(statuses, actual.footer, expected.footer);

  return statuses;
}

export function formatGoldenReceiptReport(result: GoldenReceiptResult): string {
  const lines: string[] = [`[${result.slug}] ${result.label}`];

  for (const status of result.statuses) {
    lines.push(status.ok ? `✓ ${status.path}` : `✗ ${status.path}`);
    if (!status.ok) {
      lines.push("Expected:");
      lines.push(formatValue(status.expected));
      lines.push("Actual:");
      lines.push(formatValue(status.actual));
    }
  }

  lines.push(result.passed ? "PASS" : "FAIL");
  return lines.join("\n");
}

export function formatGoldenSuiteReport(result: GoldenSuiteResult): string {
  const lines: string[] = [
    "=== Receipt Engine V2 Golden Suite ===",
    "",
  ];

  for (const receipt of result.results) {
    lines.push(formatGoldenReceiptReport(receipt));
    lines.push("");
  }

  lines.push(
    `Summary: ${result.passedCount}/${result.receiptCount} passed, ${result.failedCount} failed`
  );

  return lines.join("\n");
}

export function runGoldenReceipt(receipt: GoldenReceipt): GoldenReceiptResult {
  const engineResult = runReceiptEngineV2(buildVisionResult(receipt));
  const statuses = compareGoldenPurchase(engineResult.purchase, receipt.expected);
  const diffs = statuses.filter((status) => !status.ok);
  const passed = diffs.length === 0;

  const result: GoldenReceiptResult = {
    slug: receipt.meta.slug,
    label: receipt.meta.label,
    passed,
    statuses,
    diffs,
    report: "",
  };

  return {
    ...result,
    report: formatGoldenReceiptReport(result),
  };
}

export function runGoldenSuite(
  receipts: readonly GoldenReceipt[] = loadAllGoldenReceipts()
): GoldenSuiteResult {
  const results = receipts.map((receipt) => runGoldenReceipt(receipt));
  const passedCount = results.filter((result) => result.passed).length;
  const failedCount = results.length - passedCount;

  const suite: GoldenSuiteResult = {
    passed: failedCount === 0,
    receiptCount: results.length,
    passedCount,
    failedCount,
    results,
    report: "",
  };

  return {
    ...suite,
    report: formatGoldenSuiteReport(suite),
  };
}
