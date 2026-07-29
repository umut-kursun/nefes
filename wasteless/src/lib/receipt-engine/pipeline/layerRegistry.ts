import type { ReceiptEngineLayer } from "../types/layer";
import { layer0Image } from "../layer-0-image/imageAcquisition.layer";
import { layer1Ocr } from "../layer-1-ocr/ocrExtractor.layer";
import { layer2Layout } from "../layer-2-layout/layoutReconstructor.layer";
import { layer3Graph } from "../layer-3-graph/receiptGraphBuilder.layer";
import { layer4Classify } from "../layer-4-classify/lineClassifier.layer";
import { layer5Blocks } from "../layer-5-blocks/blockBuilder.layer";
import { layer6Purchase } from "../layer-6-purchase/purchaseBuilder.layer";
import { layer7Validate } from "../layer-7-validate/validator.layer";
import { layer8Knowledge } from "../layer-8-knowledge/knowledgeEngine.layer";
import { layer9Expense } from "../layer-9-expense/expenseBuilder.layer";

/** Injectable layer stack — override individual layers in tests. */
export interface LayerStack {
  l0: typeof layer0Image;
  l1: typeof layer1Ocr;
  l2: typeof layer2Layout;
  l3: typeof layer3Graph;
  l4: typeof layer4Classify;
  l5: typeof layer5Blocks;
  l6: typeof layer6Purchase;
  l7: typeof layer7Validate;
  l8: typeof layer8Knowledge;
  l9: typeof layer9Expense;
}

export function createDefaultLayerStack(): LayerStack {
  return {
    l0: layer0Image,
    l1: layer1Ocr,
    l2: layer2Layout,
    l3: layer3Graph,
    l4: layer4Classify,
    l5: layer5Blocks,
    l6: layer6Purchase,
    l7: layer7Validate,
    l8: layer8Knowledge,
    l9: layer9Expense,
  };
}

export type AnyReceiptEngineLayer = ReceiptEngineLayer<unknown, unknown>;

export function layerStackAsOrderedList(stack: LayerStack): AnyReceiptEngineLayer[] {
  return [
    stack.l0,
    stack.l1,
    stack.l2,
    stack.l3,
    stack.l4,
    stack.l5,
    stack.l6,
    stack.l7,
    stack.l8,
    stack.l9,
  ];
}
