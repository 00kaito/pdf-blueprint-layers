import React, {useEffect, useRef} from 'react';
import type {PDFPageProxy, RenderTask} from 'pdfjs-dist';

interface PdfPageCanvasProps {
  page: PDFPageProxy | null;
  /** Displayed size of the page (CSS px, at the current zoom). */
  cssWidth: number;
  cssHeight: number;
  /** Largest canvas in device pixels; above it the canvas keeps its size and is only CSS-stretched. */
  maxPixels: number;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  className?: string;
  onRendered?: () => void;
}

/**
 * A PDF page on a canvas, double-buffered. react-pdf's <Page> remounts its canvas on every zoom
 * (the canvas is keyed by the scale) and hides it until re-rendered, so the blueprint blinked out
 * on each zoom. Here the canvas element stays: its CSS size follows the zoom at once (the old
 * pixels are stretched), the new resolution is rendered offscreen and swapped in when complete.
 * When the pixel size does not change (e.g. above the canvas budget at high zoom) nothing is
 * re-rendered at all.
 */
export const PdfPageCanvas = ({ page, cssWidth, cssHeight, maxPixels, canvasRef, className, onRendered }: PdfPageCanvasProps) => {
  const ownRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? ownRef;
  const renderedRef = useRef<{ page: PDFPageProxy; w: number; h: number } | null>(null);
  const onRenderedRef = useRef(onRendered);
  onRenderedRef.current = onRendered;

  const dpr = window.devicePixelRatio || 1;
  let pxW = Math.round(cssWidth * dpr);
  let pxH = Math.round(cssHeight * dpr);
  if (pxW * pxH > maxPixels && cssWidth > 0 && cssHeight > 0) {
    // From the aspect ratio only, so the size is identical at every zoom above the budget.
    const vp = page?.getViewport({ scale: 1 });
    const aspect = vp ? vp.height / vp.width : cssHeight / cssWidth;
    pxW = Math.floor(Math.sqrt(maxPixels / aspect));
    pxH = Math.floor(pxW * aspect);
  }
  pxW = Math.max(1, pxW);
  pxH = Math.max(1, pxH);

  useEffect(() => {
    const canvas = ref.current;
    if (!page || !canvas) return;
    const done = renderedRef.current;
    if (done && done.page === page && done.w === pxW && done.h === pxH) return;

    const unscaled = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: pxW / unscaled.width });
    const off = document.createElement('canvas');
    off.width = pxW;
    off.height = pxH;
    const ctx = off.getContext('2d', { alpha: false });
    if (!ctx) return;
    let task: RenderTask | null = page.render({ canvas: off, canvasContext: ctx, viewport });
    let cancelled = false;
    task.promise.then(() => {
      task = null;
      if (cancelled) return;
      canvas.width = pxW;
      canvas.height = pxH;
      canvas.getContext('2d', { alpha: false })?.drawImage(off, 0, 0);
      off.width = 0; // release the buffer now rather than at GC
      renderedRef.current = { page, w: pxW, h: pxH };
      onRenderedRef.current?.();
    }).catch(() => { /* cancelled or failed: keep the previous pixels */ });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [page, pxW, pxH, ref]);

  // Releases the pixels on unmount (browsers free canvas memory lazily otherwise).
  useEffect(() => () => {
    const canvas = ref.current;
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }, [ref]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ display: 'block', width: cssWidth, height: cssHeight, userSelect: 'none' }}
    />
  );
};
