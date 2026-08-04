import type { ReceiptDebugImageMeta } from "./exportSchema";

export function resolveImageOrientation(
  width: number,
  height: number
): ReceiptDebugImageMeta["orientation"] {
  if (width <= 0 || height <= 0) return undefined;
  if (width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

export function withImageOrientation(meta: {
  width: number;
  height: number;
  sizeBytes: number;
}): ReceiptDebugImageMeta {
  return {
    ...meta,
    orientation: resolveImageOrientation(meta.width, meta.height),
  };
}
