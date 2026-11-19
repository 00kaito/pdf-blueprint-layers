import React, {useEffect, useLayoutEffect, useRef} from 'react';
import type {PDFPageProxy, RenderTask} from 'pdfjs-dist';
import {CANVAS_BASE_WIDTH, MAX_CANVAS_PIXELS} from '@/core/constants';

/** Wait after the last scroll / zoom before re-rendering the visible part. */
const RENDER_DELAY_MS = 120;
/** Extra margin rendered around the view (share of the view size), so short pans stay sharp. */
const MARGIN = 0.25;

interface PdfDetailLayerProps {
  page: PDFPageProxy | null;
  scale: number;
  /** Page height in unscaled canvas units. */
  pageHeight: number;
  /** Pixel ratio the full page canvas was rendered at; the tile is only needed when it is below the screen's. */
  basePixelRatio: number;
  scrollRef: React.RefObject<HTMLDivElement>;
  pageRef: React.RefObject<HTMLDivElement>;
  /** The full page canvas — the tile is aligned to it. */
  baseCanvasRef: React.RefObject<HTMLCanvasElement>;
  /** The tile canvas (shared with useZoomSnapshot, which hides it on a zoom change). */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Called each time a freshly rendered tile is shown. */
  onShown?: () => void;
}

const hide = (canvas: HTMLCanvasElement | null) => {
  if (canvas) canvas.style.visibility = 'hidden';
};

/**
 * At high zoom the full page canvas is rendered at a reduced resolution (mobile browsers cannot
 * hold a canvas that big). This layer renders just the visible part of the page at the screen's
 * full resolution on top of it, so the blueprint stays sharp.
 *
 * The tile's pixels, position and size are all set imperatively in one step: going through React
 * state would show the new pixels at the old position for a frame (the plan "jumps" while panning).
 */
export const PdfDetailLayer = ({ page, scale, pageHeight, basePixelRatio, scrollRef, pageRef, baseCanvasRef, canvasRef, onShown }: PdfDetailLayerProps) => {
  const onShownRef = useRef(onShown);
  onShownRef.current = onShown;
  // Latest zoom, read by in-flight renders: one started at another zoom must not be shown.
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const taskRef = useRef<RenderTask | null>(null);
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const needed = !!page && basePixelRatio < dpr * 0.99;

  // A tile of another page would be wrong.
  useLayoutEffect(() => hide(canvasRef.current), [page, pageHeight, canvasRef]);

  // On a zoom change the tile is stretched to the new zoom (before it is painted) instead of
  // disappearing; a sharp one replaces it once rendered.
  const prevScaleRef = useRef(scale);
  useLayoutEffect(() => {
    const prev = prevScaleRef.current;
    prevScaleRef.current = scale;
    const canvas = canvasRef.current;
    if (!canvas || prev === scale || canvas.style.visibility !== 'visible') return;
    const r = scale / prev;
    const s = canvas.style;
    for (const k of ['left', 'top', 'width', 'height'] as const) s[k] = `${(parseFloat(s[k]) || 0) * r}px`;
  }, [scale, canvasRef]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!needed || !page || !scroller) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const render = () => {
      const pageEl = pageRef.current;
      const canvas = canvasRef.current;
      const base = baseCanvasRef.current;
      if (!pageEl || !canvas || !base || cancelled) return;
      // Skip while a pinch preview transforms the page — measuring now would be off.
      if (pageEl.style.transform) {
        schedule();
        return;
      }
      const view = scroller.getBoundingClientRect();
      const rect = base.getBoundingClientRect();
      const pageRect = pageEl.getBoundingClientRect();
      const ox = rect.left - pageRect.left, oy = rect.top - pageRect.top;
      const pageW = CANVAS_BASE_WIDTH * scale;
      const pageH = pageHeight * scale;
      const mx = view.width * MARGIN;
      const my = view.height * MARGIN;
      let x = Math.max(0, view.left - rect.left - mx);
      let y = Math.max(0, view.top - rect.top - my);
      let w = Math.min(pageW, view.right - rect.left + mx) - x;
      let h = Math.min(pageH, view.bottom - rect.top + my) - y;
      if (w <= 0 || h <= 0) return;
      // Keep within the canvas budget (shrinks the margin first in practice).
      const fit = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (w * h * dpr * dpr)));
      if (fit < 1) {
        const cx = x + w / 2, cy = y + h / 2;
        w *= fit; h *= fit;
        x = Math.max(0, cx - w / 2); y = Math.max(0, cy - h / 2);
      }
      x = Math.floor(x); y = Math.floor(y); w = Math.ceil(w); h = Math.ceil(h);

      taskRef.current?.cancel();
      const unscaled = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (pageW / unscaled.width) * dpr });
      // Draw into an offscreen canvas so the shown tile is only swapped once it is complete.
      const off = document.createElement('canvas');
      off.width = Math.round(w * dpr);
      off.height = Math.round(h * dpr);
      const ctx = off.getContext('2d');
      if (!ctx) return;
      const task = page.render({
        canvas: off,
        canvasContext: ctx,
        viewport,
        transform: [1, 0, 0, 1, -x * dpr, -y * dpr],
      });
      taskRef.current = task;
      task.promise.then(() => {
        if (cancelled || taskRef.current !== task || scaleRef.current !== scale) return;
        taskRef.current = null;
        // The page may have moved under a pinch preview meanwhile; the next render will catch up.
        if (pageEl.style.transform) return;
        canvas.width = off.width;
        canvas.height = off.height;
        canvas.getContext('2d')?.drawImage(off, 0, 0);
        const s = canvas.style;
        s.left = `${ox + x}px`;
        s.top = `${oy + y}px`;
        s.width = `${w}px`;
        s.height = `${h}px`;
        s.visibility = 'visible';
        onShownRef.current?.();
      }).catch(() => { /* cancelled */ });
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(render, RENDER_DELAY_MS);
    };

    schedule();
    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      taskRef.current?.cancel();
      taskRef.current = null;
      scroller.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [needed, page, scale, pageHeight, dpr, scrollRef, pageRef, baseCanvasRef, canvasRef]);

  if (!needed) return null;
  // Position, size and visibility are managed imperatively (see above), never by React.
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute pointer-events-none"
      style={{ left: 0, top: 0, width: 0, height: 0, visibility: 'hidden', zIndex: 1 }}
    />
  );
};
