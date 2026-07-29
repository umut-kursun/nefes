import type { Expense } from "@/lib/types";
import type { EngineDebugTrace } from "./layer";
import type { EnrichedPurchase } from "./models/knowledge";
import type { ValidationReport } from "./models/validation";
import type { ImageBundle } from "./models/image";
import type { EngineFailure } from "./failure";

export const RECEIPT_ENGINE_VERSION = "2.0.0-alpha";

export interface ImagePayload {
  dataUrl: string;
  variant?: "raw" | "enhanced" | "threshold";
  width?: number;
  height?: number;
  preprocessMs?: number;
}

export interface ReceiptEngineInput {
  imagePrimary: ImagePayload;
  imageAlt?: ImagePayload;
  sourceHint: string;
  config?: Partial<EngineConfig>;
  imageDataUrl?: string | null;
  aiResponseJson?: string | null;
}

export interface EngineConfig {
  debug: boolean;
  engineVersion: string;
  /** Abort pipeline when validation report is blocking (future). */
  failOnBlockingValidation: boolean;
  defaultLayoutProfileId: string;
}

export interface PartialEngineArtifacts {
  imageBundle?: ImageBundle;
  rawText?: string;
  validation?: ValidationReport;
  purchase?: EnrichedPurchase;
}

export interface EngineSuccessResult {
  success: true;
  expense: Expense;
  purchase: EnrichedPurchase;
  validation: ValidationReport;
  debug: EngineDebugTrace;
}

export interface EngineFailureResult {
  success: false;
  failure: EngineFailure;
  partial?: PartialEngineArtifacts;
  debug: EngineDebugTrace;
}

/** Public pipeline result union. */
export type EngineResult = EngineSuccessResult | EngineFailureResult;

export interface EngineMeta {
  imageDataUrl: string | null;
  aiResponseJson: string | null;
  engineVersion: string;
}
