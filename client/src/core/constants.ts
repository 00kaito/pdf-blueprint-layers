export const CANVAS_BASE_WIDTH = 600;
export const CANVAS_BASE_HEIGHT = 800; // Approximated default
export const DEFAULT_LABEL_FONT_SIZE = 1;
export const SVG_RENDER_QUALITY_MULTIPLIER = 4;

// Default dimensions for newly created objects
export const DEFAULT_TEXT_WIDTH = 200;
export const DEFAULT_TEXT_HEIGHT = 50;
/** Default size of icons, shapes and LV devices (25% smaller than the original 50). */
export const DEFAULT_ICON_SIZE = 37.5;
export const DEFAULT_IMAGE_SIZE = 200;

// Default styles
export const DEFAULT_ICON_COLOR = '#ef4444';
export const DEFAULT_TEXT_FONT_SIZE = 16;
export const DEFAULT_TEXT_COLOR = '#000000';

// Zoom limits (toolbar, pinch and Ctrl + wheel)
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 13;

/**
 * Largest canvas (in device pixels) a rendered PDF page may have. Mobile browsers silently draw
 * nothing on bigger canvases (iOS Safari: 16 777 216 px), so the blueprint vanished at high zoom.
 */
export const MAX_CANVAS_PIXELS = 16_000_000;

/** Device pixel ratio for a canvas of this CSS size that keeps it within MAX_CANVAS_PIXELS. */
export const cappedPixelRatio = (cssWidth: number, cssHeight: number, maxPixels = MAX_CANVAS_PIXELS) => {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const area = Math.max(1, cssWidth * cssHeight);
  return Math.min(dpr, Math.sqrt(maxPixels / area));
};

/**
 * Budget for the whole-page canvas. Above it the page is only CSS-stretched on zoom (no re-render,
 * cheap) and PdfDetailLayer draws the visible part sharp. Smaller than MAX_CANVAS_PIXELS so
 * re-renders stay quick on phones.
 */
export const PAGE_CANVAS_PIXELS = 8_000_000;
