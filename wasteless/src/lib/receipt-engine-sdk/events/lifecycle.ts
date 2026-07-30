import type { OcrDocument } from "@/lib/receipt-engine/types/models/image";
import type { LayoutDocument } from "@/lib/receipt-engine/types/models/layout";
import type { ReceiptGraph } from "@/lib/receipt-engine/types/models/graph";
import type { ClassifiedGraph } from "@/lib/receipt-engine/types/models/classify";
import type { PurchaseDraft } from "@/lib/receipt-engine/types/models/purchase";
import type { ValidationReportGolden } from "@/lib/receipt-engine/layer-7-validate/stripValidatedPurchase";
import type { ReceiptResult } from "../types";

export type OcrFinishedPayload = {
  ocr: OcrDocument;
  durationMs: number;
};

export type LayoutFinishedPayload = {
  layout: LayoutDocument;
  durationMs: number;
};

export type SegmentationFinishedPayload = {
  layout: LayoutDocument;
  durationMs: number;
};

export type ClassificationFinishedPayload = {
  classified: ClassifiedGraph;
  graph: ReceiptGraph;
  durationMs: number;
};

export type PurchaseDraftCreatedPayload = {
  purchase: PurchaseDraft;
  durationMs: number;
};

export type ValidationFinishedPayload = {
  validation: ValidationReportGolden;
  purchase: PurchaseDraft;
  durationMs: number;
};

export type CompletedPayload = {
  result: ReceiptResult;
};

export type LifecycleHandler<T> = (payload: T) => void;

export interface ReceiptEngineLifecycleEvents {
  onOCRFinished: OcrFinishedPayload;
  onLayoutFinished: LayoutFinishedPayload;
  onSegmentationFinished: SegmentationFinishedPayload;
  onClassificationFinished: ClassificationFinishedPayload;
  onPurchaseDraftCreated: PurchaseDraftCreatedPayload;
  onValidationFinished: ValidationFinishedPayload;
  onCompleted: CompletedPayload;
}

export type LifecycleEventName = keyof ReceiptEngineLifecycleEvents;

export class ReceiptEngineEventEmitter {
  private readonly handlers = new Map<
    LifecycleEventName,
    Set<LifecycleHandler<unknown>>
  >();

  on<K extends LifecycleEventName>(
    event: K,
    handler: LifecycleHandler<ReceiptEngineLifecycleEvents[K]>
  ): () => void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as LifecycleHandler<unknown>);
    this.handlers.set(event, set);
    return () => set.delete(handler as LifecycleHandler<unknown>);
  }

  emit<K extends LifecycleEventName>(
    event: K,
    payload: ReceiptEngineLifecycleEvents[K]
  ): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.forEach((handler) => {
      handler(payload);
    });
  }

  removeAllListeners(event?: LifecycleEventName): void {
    if (event) {
      this.handlers.delete(event);
      return;
    }
    this.handlers.clear();
  }
}

export function createEventEmitter(): ReceiptEngineEventEmitter {
  return new ReceiptEngineEventEmitter();
}
