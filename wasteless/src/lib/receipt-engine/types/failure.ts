import type { EngineFailureCode } from "./failure-codes";

export type { EngineFailureCode } from "./failure-codes";

export interface EngineFailure {
  code: EngineFailureCode;
  message: string;
  cause?: unknown;
}
