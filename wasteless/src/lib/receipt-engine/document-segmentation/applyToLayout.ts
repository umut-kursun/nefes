import type { LayoutDocument, LayoutLine } from "../types/models/layout";
import type { DocumentSection } from "../document-segmentation/types";
import { segmentDocument } from "../document-segmentation/segmentDocument";

/**
 * Attach document sections onto an existing layout (post-reconstruction).
 * Mutates a copy of lines with `section` field when present on LayoutLine.
 */
export function applySegmentationToLayout(
  layout: LayoutDocument
): LayoutDocument {
  const texts = layout.lines.map((l) => l.text);
  const seg = segmentDocument(texts);

  const lines: LayoutLine[] = layout.lines.map((line, index) => {
    const s = seg.lines[index];
    if (!s) return line;
    return {
      ...line,
      region: s.region,
      section: s.section as DocumentSection,
    };
  });

  const header: number[] = [];
  const body: number[] = [];
  const footer: number[] = [];
  for (const line of lines) {
    if (line.region === "header") header.push(line.index);
    else if (line.region === "footer") footer.push(line.index);
    else body.push(line.index);
  }

  return {
    ...layout,
    lines,
    regions: { header, body, footer },
    sections: seg.sections,
    productsEndIndex: seg.productsEndIndex,
  };
}
