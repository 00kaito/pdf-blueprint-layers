import {CANVAS_BASE_WIDTH} from './constants';

/** Upper bound for the working raster — keeps getImageData/flood fill fast on high zoom levels. */
const MAX_WORK_PIXELS = 6_000_000;

/**
 * Colour distance (0–255 per channel) still treated as "the same area" as the clicked pixel.
 * Anti-aliased walls are grey, so this must stay well below the white→line contrast.
 */
const DEFAULT_TOLERANCE = 60;

/** Grows the filled region by this many working pixels to cover anti-aliasing seams along walls. */
const DILATE_PX = 1;

export type FillResult = {
  /** PNG data URL, the region painted in `color` on a transparent background. */
  dataUrl: string;
  /** Bounding box in unscaled canvas units. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Share of the page covered by the region (0–1) — a large value usually means it leaked. */
  coverage: number;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * Paint-bucket fill on a rendered page canvas.
 * @param source   canvas the PDF page was rendered into
 * @param clickX   click position in unscaled canvas units
 * @param clickY   click position in unscaled canvas units
 */
export const floodFillRegion = (
  source: HTMLCanvasElement,
  clickX: number,
  clickY: number,
  color: string,
  tolerance = DEFAULT_TOLERANCE,
): FillResult | null => {
  // Work on a downscaled copy when the page is rendered at very high resolution.
  const ratio = Math.min(1, Math.sqrt(MAX_WORK_PIXELS / (source.width * source.height)));
  const w = Math.max(1, Math.round(source.width * ratio));
  const h = Math.max(1, Math.round(source.height * ratio));
  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const wctx = work.getContext('2d', { willReadFrequently: true });
  if (!wctx) return null;
  // Transparent page areas count as white paper.
  wctx.fillStyle = '#ffffff';
  wctx.fillRect(0, 0, w, h);
  wctx.drawImage(source, 0, 0, w, h);
  const pixels = wctx.getImageData(0, 0, w, h).data;

  const unitsPerPx = CANVAS_BASE_WIDTH / w;
  const sx = Math.floor(clickX / unitsPerPx);
  const sy = Math.floor(clickY / unitsPerPx);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;

  const seed = (sy * w + sx) * 4;
  const r0 = pixels[seed], g0 = pixels[seed + 1], b0 = pixels[seed + 2];
  // Clicked on a wall/line rather than inside an area.
  if (0.299 * r0 + 0.587 * g0 + 0.114 * b0 < 128) return null;
  const matches = (i: number) => {
    const p = i * 4;
    return (
      Math.abs(pixels[p] - r0) <= tolerance &&
      Math.abs(pixels[p + 1] - g0) <= tolerance &&
      Math.abs(pixels[p + 2] - b0) <= tolerance
    );
  };

  // Scanline flood fill.
  const mask = new Uint8Array(w * h);
  const stack: number[] = [sx, sy];
  let minX = sx, maxX = sx, minY = sy, maxY = sy, count = 0;
  while (stack.length) {
    const y = stack.pop()!;
    let x = stack.pop()!;
    let i = y * w + x;
    while (x > 0 && !mask[i - 1] && matches(i - 1)) { x--; i--; }
    let spanUp = false, spanDown = false;
    for (; x < w && !mask[i] && matches(i); x++, i++) {
      mask[i] = 1;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (y > 0) {
        const up = i - w;
        const ok = !mask[up] && matches(up);
        if (ok && !spanUp) stack.push(x, y - 1);
        spanUp = ok;
      }
      if (y < h - 1) {
        const down = i + w;
        const ok = !mask[down] && matches(down);
        if (ok && !spanDown) stack.push(x, y + 1);
        spanDown = ok;
      }
    }
  }
  if (count === 0) return null;

  // Crop (with room for dilation) and paint the region.
  minX = Math.max(0, minX - DILATE_PX);
  minY = Math.max(0, minY - DILATE_PX);
  maxX = Math.min(w - 1, maxX + DILATE_PX);
  maxY = Math.min(h - 1, maxY + DILATE_PX);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const octx = out.getContext('2d');
  if (!octx) return null;
  const img = octx.createImageData(cw, ch);
  const [r, g, b] = hexToRgb(color);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const gx = x + minX, gy = y + minY;
      let hit = false;
      for (let dy = -DILATE_PX; dy <= DILATE_PX && !hit; dy++) {
        const ny = gy + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -DILATE_PX; dx <= DILATE_PX; dx++) {
          const nx = gx + dx;
          if (nx >= 0 && nx < w && mask[ny * w + nx]) { hit = true; break; }
        }
      }
      if (!hit) continue;
      const o = (y * cw + x) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);

  return {
    dataUrl: out.toDataURL('image/png'),
    x: minX * unitsPerPx,
    y: minY * unitsPerPx,
    width: cw * unitsPerPx,
    height: ch * unitsPerPx,
    coverage: count / (w * h),
  };
};

/** Re-colours an opaque-on-transparent PNG (e.g. a fill made earlier with a different colour). */
export const tintImage = (dataUrl: string, color: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) return reject(new Error('Failed to get canvas context'));
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, c.width, c.height);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
