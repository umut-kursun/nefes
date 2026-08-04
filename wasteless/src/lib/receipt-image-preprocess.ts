/**
 * Client-side receipt image enhancement for OCR Vision.
 * Produces contrast / grayscale-threshold variants without native deps.
 */

export type PreprocessVariant = "enhanced" | "threshold" | "original";

/** Default vision fast-path edge — balances speed and OCR quality. */
export const DEFAULT_MAX_EDGE = 1280;
/** Higher-res fallback when first-pass OCR quality is low. */
export const HIGH_RES_MAX_EDGE = 2048;
/** Validation score below this triggers a high-res re-preprocess retry. */
export const LOW_VISION_QUALITY_THRESHOLD = 75;

export type PreprocessOptions = {
  readonly maxEdge?: number;
};

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel yüklenemedi"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Görsel dönüştürülemedi"));
      },
      type,
      quality
    );
  });
}

function drawFit(
  img: HTMLImageElement,
  maxEdge = DEFAULT_MAX_EDGE
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx };
}

/** Mild deskew: estimate dominant skew via horizontal projection variance. */
function estimateSkewDegrees(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const data = ctx.getImageData(0, 0, w, h).data;
  let bestAngle = 0;
  let bestScore = -1;
  for (let angle = -4; angle <= 4; angle += 1) {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const bins = new Float32Array(h);
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 6) {
        const i = (y * w + x) * 4;
        const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
        if (lum < 140) {
          const yy = Math.round((x - w / 2) * sin + (y - h / 2) * cos + h / 2);
          if (yy >= 0 && yy < h) bins[yy]! += 1;
        }
      }
    }
    let mean = 0;
    for (let i = 0; i < bins.length; i++) mean += bins[i]!;
    mean /= bins.length || 1;
    let varSum = 0;
    for (let i = 0; i < bins.length; i++) {
      const d = bins[i]! - mean;
      varSum += d * d;
    }
    if (varSum > bestScore) {
      bestScore = varSum;
      bestAngle = angle;
    }
  }
  return bestAngle;
}

function applyDeskew(
  src: HTMLCanvasElement,
  degrees: number
): HTMLCanvasElement {
  if (Math.abs(degrees) < 0.5) return src;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = src.width;
  const h = src.height;
  const nw = Math.ceil(w * cos + h * sin);
  const nh = Math.ceil(w * sin + h * cos);
  const canvas = document.createElement("canvas");
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, nw, nh);
  ctx.translate(nw / 2, nh / 2);
  ctx.rotate(rad);
  ctx.drawImage(src, -w / 2, -h / 2);
  return canvas;
}

/** Stage 2 — crop to document content bounding box (non-white pixels). */
function autoCropDocument(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  const step = 4;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const lum =
        0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
      if (lum < 245) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return canvas;
  const pad = Math.round(Math.min(w, h) * 0.02);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  if (cw < w * 0.35 || ch < h * 0.35) return canvas;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return out;
}

function enhanceContrast(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = d[i + c]!;
      const stretched = ((v - min) / range) * 255;
      // Slight mid contrast boost
      const mid = (stretched - 128) * 1.15 + 128;
      d[i + c] = Math.max(0, Math.min(255, mid));
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Block adaptive threshold — helps faded thermal prints. */
function adaptiveThreshold(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const block = 16;
  const d = src.data;
  const o = out.data;

  for (let by = 0; by < h; by += block) {
    for (let bx = 0; bx < w; bx += block) {
      let sum = 0;
      let count = 0;
      const y2 = Math.min(h, by + block);
      const x2 = Math.min(w, bx + block);
      for (let y = by; y < y2; y++) {
        for (let x = bx; x < x2; x++) {
          const i = (y * w + x) * 4;
          sum += 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
          count += 1;
        }
      }
      const mean = sum / Math.max(1, count) - 8;
      for (let y = by; y < y2; y++) {
        for (let x = bx; x < x2; x++) {
          const i = (y * w + x) * 4;
          const lum =
            0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
          const v = lum < mean ? 0 : 255;
          o[i] = v;
          o[i + 1] = v;
          o[i + 2] = v;
          o[i + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

export async function preprocessReceiptImage(
  file: File,
  variant: PreprocessVariant = "enhanced",
  options?: PreprocessOptions
): Promise<{ blob: Blob; dataUrl: string }> {
  if (typeof document === "undefined") {
    return { blob: file, dataUrl: "" };
  }

  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const img = await loadImage(file);
  const drawn = drawFit(img, maxEdge);
  let canvas = drawn.canvas;
  canvas = autoCropDocument(canvas);
  const ctxAfterCrop = canvas.getContext("2d", { willReadFrequently: true })!;
  const skew = estimateSkewDegrees(ctxAfterCrop, canvas.width, canvas.height);
  canvas = applyDeskew(canvas, skew);

  if (variant === "threshold") {
    enhanceContrast(canvas);
    adaptiveThreshold(canvas);
  } else if (variant === "enhanced") {
    enhanceContrast(canvas);
  }

  const blob = await canvasToBlob(canvas);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("dataUrl failed"));
    reader.readAsDataURL(blob);
  });
  return { blob, dataUrl };
}

/** True when a second pass at HIGH_RES_MAX_EDGE may improve vision OCR. */
export function shouldRetryWithHigherResolution(input: {
  validationScore?: number;
  consistent?: boolean;
  confidence?: number;
}): boolean {
  if (input.consistent === false) return true;
  if (
    input.validationScore != null &&
    input.validationScore < LOW_VISION_QUALITY_THRESHOLD
  ) {
    return true;
  }
  if (input.confidence != null && input.confidence < 0.65) return true;
  return false;
}

/** Original file as data URL for storage (never replace with OCR text). */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Dosya okunamadı"));
    reader.readAsDataURL(file);
  });
}
