import type { ExportFormat, ReceiptResult } from "../types";
import { exportCsvFromResult } from "./exportCsv";
import { exportDebugBundle } from "./exportDebugBundle";
import { exportExcelFromResult } from "./exportExcel";
import { exportHtml } from "./exportHtml";
import { exportMarkdown } from "./exportMarkdown";
import { exportPurchaseFromResult } from "./exportPurchaseJson";
import { exportQualityReport } from "./exportQualityReport";
import { exportRegressionBundle } from "./exportRegressionBundle";

export type ExportOutput = string | Buffer;

/** Dispatch export by format name. */
export async function exportReceiptResult(
  result: ReceiptResult,
  format: ExportFormat
): Promise<ExportOutput> {
  switch (format) {
    case "json":
      return exportPurchaseFromResult(result);
    case "csv":
      return exportCsvFromResult(result);
    case "excel":
      return exportExcelFromResult(result);
    case "markdown":
      return exportMarkdown(result);
    case "html":
      return exportHtml(result);
    case "debug-bundle":
      return exportDebugBundle(result);
    case "regression-bundle":
      return exportRegressionBundle(result);
    case "quality-report":
      return exportQualityReport(result);
    default: {
      const exhaustive: never = format;
      throw new Error(`Unsupported export format: ${exhaustive}`);
    }
  }
}

export { exportPurchaseJson, exportPurchaseFromResult } from "./exportPurchaseJson";
export { exportCsv, exportCsvFromResult } from "./exportCsv";
export { exportExcel, exportExcelFromResult } from "./exportExcel";
export { exportMarkdown } from "./exportMarkdown";
export { exportHtml } from "./exportHtml";
export { exportDebugBundle } from "./exportDebugBundle";
export { exportRegressionBundle } from "./exportRegressionBundle";
export { exportQualityReport } from "./exportQualityReport";
