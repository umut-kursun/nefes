export {
  type DocumentSection,
  type DocumentSegmentation,
  type SegmentedLine,
  type CoarseRegion,
  SECTION_ORDER,
  sectionToCoarseRegion,
  isProductSection,
  isFooterLikeSection,
} from "./types";
export { segmentDocument } from "./segmentDocument";
export {
  nextSectionState,
  detectTransitionTarget,
  looksLikeProductStart,
} from "./sectionStateMachine";
export * from "./sectionMarkers";
