export {
  analyzeReceipt,
  createReceiptEngine,
  ReceiptEngineSDK,
} from "./analyzeReceipt";

export type {
  ReceiptResult,
  ReceiptAnalyzeInput,
  ReceiptImageDataUrlInput,
  ReceiptImageBufferInput,
  ReceiptOcrTextInput,
  ReceiptEngineSDKOptions,
  ExportFormat,
} from "./types";

export type { AnalyzeReceiptOptions } from "./analyzeReceipt";

export {
  resolveSdkConfig,
  DEFAULT_SDK_ENGINE_CONFIG,
} from "./config/SdkEngineConfig";
export type {
  SdkEngineConfig,
  SdkEngineModes,
  SdkConfidenceThresholds,
  PartialSdkEngineConfig,
} from "./config/SdkEngineConfig";

export { PluginRegistry } from "./plugins/registry";
export type {
  ReceiptEnginePlugin,
  PluginKind,
  MerchantPlugin,
  CountryPlugin,
  OcrProviderPlugin,
  CurrencyPlugin,
  NormalizationPlugin,
  ValidationPlugin,
  ExportPlugin,
} from "./plugins/types";

export { ocrProviderRegistry } from "./ocr/ocrProviderRegistry";
export type { OcrProviderFactoryOptions } from "./ocr/ocrProviderRegistry";
export * from "./ocr/providers/index";
export {
  STUB_AWS_TEXTRACT,
  STUB_AZURE_OCR,
  STUB_GOOGLE_VISION,
  STUB_LOCAL_OCR,
  STUB_TESSERACT,
} from "./ocr/providers/stubs";

export {
  exportReceiptResult,
  exportPurchaseJson,
  exportCsv,
  exportExcel,
  exportMarkdown,
  exportHtml,
  exportDebugBundle,
  exportRegressionBundle,
  exportQualityReport,
} from "./export/index";

export {
  ReceiptEngineEventEmitter,
  createEventEmitter,
} from "./events/lifecycle";
export type {
  ReceiptEngineLifecycleEvents,
  LifecycleEventName,
  LifecycleHandler,
} from "./events/lifecycle";

export {
  resolveVersionMetadata,
  ENGINE_VERSION,
  SCHEMA_VERSION,
  CORPUS_VERSION,
  GOLDEN_VERSION,
  REGRESSION_VERSION,
  PARSER_VERSION,
} from "./versioning/versions";
export type { ReceiptEngineVersions } from "./versioning/versions";

export { runSdkBenchmark } from "./benchmark/runSdkBenchmark";
export type {
  SdkBenchmarkReport,
  SdkBenchmarkMemoryEstimate,
} from "./benchmark/runSdkBenchmark";
