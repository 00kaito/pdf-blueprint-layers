import {useEffect, useLayoutEffect, useRef} from 'react';
import {useUI} from '@/lib/editor-context';

/** Same limits as the toolbar zoom controls. */
const MIN_SCALE = 0.1;
const MAX_SCALE = 10;

type Pinch = {
  startDistance: number;
  startScale: number;
  /** Gesture midpoint relative to the page at the start of the pinch (screen px). */
  anchorX: number;
  anchorY: number;
  /** Gesture midpoint at the start (screen px). */
  startClientX: number;
  startClientY: number;
  /** Current gesture midpoint (screen px) — the anchor must end up here. */
  clientX: number;
  clientY: number;
  scale: number;
};

/** Ctrl/⌘ + wheel: zoom factor per wheel delta unit, and the pause after which the zoom is committed. */
const WHEEL_ZOOM_SPEED = 0.0015;
const WHEEL_COMMIT_DELAY_MS = 150;

const distance = (a: Touch, b: Touch) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

let scrollbarCache: number | null = null;
/** Thickness of a classic scrollbar (0 with overlay scrollbars), measured once. */
const scrollbarSize = () => {
  if (scrollbarCache === null) {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll';
    document.body.appendChild(probe);
    scrollbarCache = probe.offsetWidth - probe.clientWidth;
    probe.remove();
  }
  return scrollbarCache;
};

/**
 * Where one axis of the page settles: centred when it fits the view (the page has `m-auto`),
 * otherwise scrolled so the anchor is under the pointer, within the scroll range. `extent` is the
 * scrollable length (sideways the wrapper is only as wide as the view, so its end padding does not count).
 * Returns the page start in screen px.
 */
const settleAxis = (viewStart: number, viewSize: number, size: number, pad: number, extent: number, anchor: number, pointer: number) => {
  if (size + 2 * pad <= viewSize) return viewStart + (viewSize - size) / 2;
  const maxScroll = Math.max(0, extent - viewSize);
  const scroll = Math.min(maxScroll, Math.max(0, pad + anchor - (pointer - viewStart)));
  return viewStart + pad - scroll;
};

/** Where the page is laid out now (screen px), ignoring any preview transform. */
const layoutPosition = (scroller: HTMLDivElement, page: HTMLDivElement) => {
  const box = scroller.getBoundingClientRect();
  return {
    left: box.left + scroller.clientLeft + page.offsetLeft - scroller.scrollLeft,
    top: box.top + scroller.clientTop + page.offsetTop - scroller.scrollTop,
  };
};

/**
 * Screen position the page gets once zoomed to `pinch.scale` and scrolled to keep the anchor under
 * the pointer — within the layout's limits (centring, scroll range, scrollbars). The CSS preview
 * shows the page exactly there, so nothing jumps when the real zoom is committed.
 */
const settledPosition = (scroller: HTMLDivElement, page: HTMLDivElement, pinch: Pinch) => {
  const ratio = pinch.scale / pinch.startScale;
  const width = page.offsetWidth * ratio;
  const height = page.offsetHeight * ratio;
  const parent = page.parentElement;
  const pad = parent ? parseFloat(getComputedStyle(parent).paddingLeft) || 0 : 0;
  const box = scroller.getBoundingClientRect();
  const extentX = pad + width;
  const extentY = 2 * pad + height;
  // Scrollbars appear when the zoomed page overflows and take room from the view.
  const bar = scrollbarSize();
  let barY = extentY > box.height;
  const barX = extentX > box.width - (barY ? bar : 0);
  barY = barY || extentY > box.height - (barX ? bar : 0);
  return {
    left: settleAxis(box.left, box.width - (barY ? bar : 0), width, pad, extentX, pinch.anchorX * ratio, pinch.clientX),
    top: settleAxis(box.top, box.height - (barX ? bar : 0), height, pad, extentY, pinch.anchorY * ratio, pinch.clientY),
  };
};

/**
 * Two-finger pinch zoom around the gesture midpoint, and two-finger pan (moving the midpoint) —
 * needed where a single finger operates a tool and the browser does not scroll (`touch-action: none`).
 *
 * While pinching the page is only CSS-transformed (cheap), placed where the real zoom will put it;
 * the real zoom — which re-renders the PDF — is dispatched once when the fingers lift, then the
 * scroll position is set to match the preview. Listeners are native and non-passive so the
 * browser's own page zoom can be prevented.
 */
export const usePinchZoom = (
  scrollRef: React.RefObject<HTMLDivElement>,
  pageRef: React.RefObject<HTMLDivElement>,
  /** Returns true while pinching must not start (e.g. a stylus stroke with a palm on the screen). */
  isBlocked: () => boolean = () => false,
) => {
  const isBlockedRef = useRef(isBlocked);
  isBlockedRef.current = isBlocked;
  const { state: uiState, dispatch } = useUI();
  const scaleRef = useRef(uiState.scale);
  scaleRef.current = uiState.scale;
  const pinchRef = useRef<Pinch | null>(null);
  /** Screen position the page must have after the committed zoom is laid out (the preview's). */
  const pendingTargetRef = useRef<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const beginAt = (clientX: number, clientY: number, startDistance: number): Pinch | null => {
      const page = pageRef.current;
      if (!page) return null;
      const rect = page.getBoundingClientRect();
      return {
        startDistance,
        startScale: scaleRef.current,
        anchorX: clientX - rect.left,
        anchorY: clientY - rect.top,
        startClientX: clientX,
        startClientY: clientY,
        clientX,
        clientY,
        scale: scaleRef.current,
      };
    };

    const startPinch = (e: TouchEvent) => {
      // A committed zoom not laid out yet still has its preview on: measuring now would be off.
      if (pinchRef.current || pendingTargetRef.current || e.touches.length !== 2 || isBlockedRef.current()) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      pinchRef.current = beginAt((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2, distance(a, b) || 1);
    };

    /** CSS preview: the page scaled and moved to where the real zoom will put it. */
    const preview = (pinch: Pinch) => {
      const page = pageRef.current;
      if (!page) return;
      const target = settledPosition(scroller, page, pinch);
      // Relative to where the page is laid out right now: scrollbars brought in by the preview
      // itself re-centre the page, so the position from the start of the gesture can be stale.
      const now = layoutPosition(scroller, page);
      page.style.transformOrigin = '0 0';
      page.style.transform = `translate(${target.left - now.left}px, ${target.top - now.top}px) scale(${pinch.scale / pinch.startScale})`;
    };

    /** Scrolls so the (untransformed) page starts at `target` on screen. */
    const scrollPageTo = (page: HTMLDivElement, target: { left: number; top: number }) => {
      const rect = page.getBoundingClientRect();
      scroller.scrollLeft += rect.left - target.left;
      scroller.scrollTop += rect.top - target.top;
    };

    const clearPreview = (page: HTMLDivElement) => {
      page.style.transform = '';
      page.style.transformOrigin = '';
    };

    const onTouchMove = (e: TouchEvent) => {
      // Also started here: on the second finger's touchstart a just-cancelled measurement / stroke
      // can still block (the guard only updates on the next render).
      if (!pinchRef.current) startPinch(e);
      const pinch = pinchRef.current;
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const ratio = distance(a, b) / pinch.startDistance;
      pinch.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.startScale * ratio));
      pinch.clientX = (a.clientX + b.clientX) / 2;
      pinch.clientY = (a.clientY + b.clientY) / 2;
      preview(pinch);
    };

    /** Ends the gesture: pan only scrolls right away; a zoom is dispatched, the preview kept until it is laid out. */
    const commit = () => {
      const pinch = pinchRef.current;
      const page = pageRef.current;
      pinchRef.current = null;
      if (!pinch || !page) return;
      if (Math.abs(pinch.scale - pinch.startScale) < 0.01) {
        const target = settledPosition(scroller, page, { ...pinch, scale: pinch.startScale });
        clearPreview(page);
        scrollPageTo(page, target);
        return;
      }
      // Clearing the preview here would show the old zoom for a frame before the new one renders.
      pendingTargetRef.current = settledPosition(scroller, page, pinch);
      dispatch({ type: 'SET_SCALE', payload: pinch.scale });
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (pinchRef.current && e.touches.length < 2) commit();
    };

    // Ctrl/⌘ + wheel (and trackpad pinch, which browsers report as Ctrl + wheel) zooms around the cursor.
    // Same preview-then-commit approach as the touch pinch, committed once the wheel pauses.
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      // Wheel ticks between the commit and its layout are dropped (the page is mid-swap).
      if (pendingTargetRef.current) return;
      if (!pinchRef.current) pinchRef.current = beginAt(e.clientX, e.clientY, 1);
      const pinch = pinchRef.current;
      if (!pinch) return;
      pinch.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.scale * Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED)));
      preview(pinch);
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        wheelTimer = null;
        commit();
      }, WHEEL_COMMIT_DELAY_MS);
    };

    scroller.addEventListener('wheel', onWheel, { passive: false });
    scroller.addEventListener('touchstart', startPinch, { passive: true });
    scroller.addEventListener('touchmove', onTouchMove, { passive: false });
    scroller.addEventListener('touchend', onTouchEnd);
    scroller.addEventListener('touchcancel', onTouchEnd);
    return () => {
      if (wheelTimer) clearTimeout(wheelTimer);
      scroller.removeEventListener('wheel', onWheel);
      scroller.removeEventListener('touchstart', startPinch);
      scroller.removeEventListener('touchmove', onTouchMove);
      scroller.removeEventListener('touchend', onTouchEnd);
      scroller.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [scrollRef, pageRef, dispatch]);

  // Once the new zoom is laid out (before it is painted): drop the preview and scroll the page to
  // where the preview showed it.
  useLayoutEffect(() => {
    const target = pendingTargetRef.current;
    const scroller = scrollRef.current;
    const page = pageRef.current;
    if (!target || !scroller || !page) return;
    pendingTargetRef.current = null;
    page.style.transform = '';
    page.style.transformOrigin = '';
    const rect = page.getBoundingClientRect();
    scroller.scrollLeft += rect.left - target.left;
    scroller.scrollTop += rect.top - target.top;
  }, [uiState.scale, scrollRef, pageRef]);
};
