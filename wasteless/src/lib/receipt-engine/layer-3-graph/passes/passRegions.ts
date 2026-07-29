import type { LayoutDocument } from "../../types/models/layout";
import type { GraphBuilderState } from "../graphImmutable";
import { withRegions } from "../graphImmutable";
import { rawLineId } from "../graphIds";

export function passRegions(
  state: GraphBuilderState,
  layout: LayoutDocument
): GraphBuilderState {
  const header = layout.regions.header.map((idx) => rawLineId(idx));
  const body = layout.regions.body.map((idx) => rawLineId(idx));
  const footer = layout.regions.footer.map((idx) => rawLineId(idx));

  return withRegions(state, {
    header: Object.freeze(header),
    body: Object.freeze(body),
    footer: Object.freeze(footer),
  });
}
