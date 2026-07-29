import type { LayerId, LayerSnapshot, EngineDebugTrace } from "../types/layer";
import { RECEIPT_ENGINE_VERSION } from "../types/pipeline";

export function createDebugTrace(): EngineDebugTrace {
  return {
    engineVersion: RECEIPT_ENGINE_VERSION,
    startedAt: new Date().toISOString(),
    snapshots: [],
  };
}

export function recordLayerSnapshot(
  trace: EngineDebugTrace,
  snapshot: LayerSnapshot
): void {
  trace.snapshots.push(snapshot);
}

export function finalizeDebugTrace(trace: EngineDebugTrace): EngineDebugTrace {
  trace.finishedAt = new Date().toISOString();
  return trace;
}

export function getLayerExecutionOrder(trace: EngineDebugTrace): LayerId[] {
  return trace.snapshots.map((s) => s.layerId);
}
