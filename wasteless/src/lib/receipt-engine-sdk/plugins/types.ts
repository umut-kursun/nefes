import type { OcrProvider } from "@/lib/receipt-engine/layer-1-ocr/providers/ocrProvider";
import type { MerchantLayoutProfile } from "@/lib/receipt-engine-quality/profiles/merchantProfileRegistry";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { ReceiptResult } from "../types";

export interface PluginMetadata {
  readonly id: string;
  readonly name: string;
  readonly version?: string;
}

export interface MerchantPlugin extends PluginMetadata {
  readonly profile: MerchantLayoutProfile;
}

export interface CountryPlugin extends PluginMetadata {
  readonly countryCode: string;
  readonly defaultCurrency: string;
  readonly defaultLanguage: string;
}

export interface OcrProviderPlugin extends PluginMetadata {
  readonly provider: OcrProvider;
}

export interface CurrencyPlugin extends PluginMetadata {
  readonly currencyCode: string;
  readonly symbol: string;
}

export interface NormalizationPlugin extends PluginMetadata {
  normalizeText(text: string): string;
}

export interface ValidationPlugin extends PluginMetadata {
  readonly priority?: number;
  validate(
    purchase: PurchaseDraft,
    report: ValidationReportGolden
  ): ValidationReportGolden;
}

export interface ExportPlugin extends PluginMetadata {
  readonly format: string;
  export(result: ReceiptResult): string | Buffer | Promise<string | Buffer>;
}

export type ReceiptEnginePlugin =
  | MerchantPlugin
  | CountryPlugin
  | OcrProviderPlugin
  | CurrencyPlugin
  | NormalizationPlugin
  | ValidationPlugin
  | ExportPlugin;

export type PluginKind =
  | "merchant"
  | "country"
  | "ocrProvider"
  | "currency"
  | "normalization"
  | "validation"
  | "export";
