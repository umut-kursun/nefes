import type { ClassifiedGraph } from "../types/models/classify";
import type { BlockDocument } from "../types/models/blocks";
import { buildGraphIndex } from "../graph/graphIndex";
import { buildAllChainViews } from "../graph/chainView";
import { buildAllRowViews } from "../graph/rowView";
import { averageConfidence } from "./blockProvenance";
import { buildFooterBlock } from "./footerBlockBuilder";
import { buildMetadataBlock } from "./metadataBlockBuilder";
import { buildProductBlocks } from "./productBlockBuilder";
import { buildUnknownBlock } from "./unknownBlockBuilder";

export function buildBlockDocument(classified: ClassifiedGraph): BlockDocument {
  const index = buildGraphIndex(classified.graph);
  const chains = buildAllChainViews(index);
  const rows = buildAllRowViews(index);
  const assigned = new Set<string>();

  const metadata = buildMetadataBlock(classified, assigned);
  const products = Object.freeze(
    buildProductBlocks(chains, index, classified, assigned)
  );
  const footer = buildFooterBlock(rows, index, classified, assigned);
  const unknown = buildUnknownBlock(classified, assigned);

  const allConfidences = [
    ...products.map((p) => p.confidence),
    footer.confidence,
    metadata.confidence,
    unknown.confidence,
  ].filter((c) => c > 0);

  return Object.freeze({
    products,
    footer,
    metadata,
    unknown,
    confidence: averageConfidence(allConfidences),
  });
}
