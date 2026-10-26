import type {ExportCrop} from '@/lib/types';

/** Print paper sizes, portrait, in millimetres. */
export const PAPER_SIZES = {
  A4: { label: 'A4', w: 210, h: 297 },
  A3: { label: 'A3', w: 297, h: 420 },
  A2: { label: 'A2', w: 420, h: 594 },
  A1: { label: 'A1', w: 594, h: 841 },
  A0: { label: 'A0', w: 841, h: 1189 },
  LETTER: { label: 'Letter (8.5×11 in)', w: 215.9, h: 279.4 },
  TABLOID: { label: 'Tabloid (11×17 in)', w: 279.4, h: 431.8 },
  ARCH_C: { label: 'ARCH C (18×24 in)', w: 457.2, h: 609.6 },
  ARCH_D: { label: 'ARCH D (24×36 in)', w: 609.6, h: 914.4 },
  ARCH_E: { label: 'ARCH E (36×48 in)', w: 914.4, h: 1219.2 },
} as const;

export type PaperId = keyof typeof PAPER_SIZES;
export type PaperOrientation = 'portrait' | 'landscape';
export type CropRect = { x: number; y: number; width: number; height: number };

const MM_TO_PT = 72 / 25.4;

/** Paper size in PDF points as seen on the sheet (orientation applied). */
export const paperSizePt = (paper: PaperId, orientation: PaperOrientation) => {
  const { w, h } = PAPER_SIZES[paper];
  const [short, long] = [w * MM_TO_PT, h * MM_TO_PT];
  return orientation === 'landscape' ? { width: long, height: short } : { width: short, height: long };
};

/** Width / height of the paper as seen on the sheet. */
export const paperAspect = (paper: PaperId, orientation: PaperOrientation) => {
  const { width, height } = paperSizePt(paper, orientation);
  return width / height;
};

/** Shifts the rect inside the page (it must already fit). */
const clampInto = (r: CropRect, pageW: number, pageH: number): CropRect => ({
  ...r,
  x: Math.min(Math.max(0, r.x), Math.max(0, pageW - r.width)),
  y: Math.min(Math.max(0, r.y), Math.max(0, pageH - r.height)),
});

/** Largest width of a rect with this aspect that fits the page. */
const maxWidth = (aspect: number, pageW: number, pageH: number) => Math.min(pageW, pageH * aspect);

/**
 * Crop rect with the paper's aspect: around the previous rect's centre with about its area,
 * or the largest one centred on the page when there is none.
 */
export const fitCropRect = (aspect: number, pageW: number, pageH: number, previous?: CropRect | null): CropRect => {
  const limit = maxWidth(aspect, pageW, pageH);
  if (!previous) {
    return { x: (pageW - limit) / 2, y: (pageH - limit / aspect) / 2, width: limit, height: limit / aspect };
  }
  const width = Math.min(limit, Math.sqrt(previous.width * previous.height * aspect));
  const height = width / aspect;
  const cx = previous.x + previous.width / 2;
  const cy = previous.y + previous.height / 2;
  return clampInto({ x: cx - width / 2, y: cy - height / 2, width, height }, pageW, pageH);
};

/** Smallest crop frame, as a share of the page width. */
const MIN_CROP_SHARE = 0.05;

/**
 * Resizes the rect from a dragged corner (`dx`, `dy` = pointer travel), keeping the aspect and the
 * opposite corner in place, within the page.
 */
export const resizeCropRect = (
  r: CropRect, corner: 'nw' | 'ne' | 'sw' | 'se', dx: number, dy: number, pageW: number, pageH: number,
): CropRect => {
  const aspect = r.width / r.height;
  const east = corner === 'ne' || corner === 'se';
  const south = corner === 'sw' || corner === 'se';
  // The fixed corner and the room the page leaves from it.
  const fx = east ? r.x : r.x + r.width;
  const fy = south ? r.y : r.y + r.height;
  const roomW = east ? pageW - fx : fx;
  const roomH = south ? pageH - fy : fy;
  // Follow whichever pointer axis grows the frame more.
  const wantW = Math.max(r.width + (east ? dx : -dx), (r.height + (south ? dy : -dy)) * aspect);
  const width = Math.max(pageW * MIN_CROP_SHARE, Math.min(wantW, roomW, roomH * aspect));
  const height = width / aspect;
  return { x: east ? fx : fx - width, y: south ? fy : fy - height, width, height };
};

export const moveCropRect = (r: CropRect, dx: number, dy: number, pageW: number, pageH: number): CropRect =>
  clampInto({ ...r, x: r.x + dx, y: r.y + dy }, pageW, pageH);

/** Default orientation: the one of the page. */
export const pageOrientation = (pageW: number, pageH: number): PaperOrientation =>
  pageW >= pageH ? 'landscape' : 'portrait';

/** New crop for a paper / orientation change, keeping the frame where it was. */
export const cropForPaper = (
  paper: PaperId, orientation: PaperOrientation, pageW: number, pageH: number, previous?: ExportCrop | null,
): ExportCrop => ({
  paper,
  orientation,
  rect: fitCropRect(paperAspect(paper, orientation), pageW, pageH, previous?.rect),
});
