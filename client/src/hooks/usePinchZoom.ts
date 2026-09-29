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

/**
 * Two-finger pinch zoom around the gesture midpoint, and two-finger pan (moving the midpoint) —
 * needed where a single finger operates a tool and the browser does not scroll (`touch-action: none`).
 *
 * While pinching the page is only CSS-scaled (cheap); the real zoom — which re-renders the PDF —
 * is dispatched once when the fingers lift, then the scroll position is corrected so the point
 * under the fingers stays put. Listeners are native and non-passive so the browser's own page
 * zoom can be prevented.
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
  /** Canvas point that must end up under `clientX/Y` after the committed zoom re-renders. */
  const pendingAnchorRef = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const startPinch = (e: TouchEvent) => {
      const page = pageRef.current;
      if (pinchRef.current || e.touches.length !== 2 || !page || isBlockedRef.current()) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      const rect = page.getBoundingClientRect();
      const clientX = (a.clientX + b.clientX) / 2;
      const clientY = (a.clientY + b.clientY) / 2;
      pinchRef.current = {
        startDistance: distance(a, b) || 1,
        startScale: scaleRef.current,
        anchorX: clientX - rect.left,
        anchorY: clientY - rect.top,
        startClientX: clientX,
        startClientY: clientY,
        clientX,
        clientY,
        scale: scaleRef.current,
      };
      page.style.transformOrigin = `${clientX - rect.left}px ${clientY - rect.top}px`;
    };

    const onTouchMove = (e: TouchEvent) => {
      // Also started here: on the second finger's touchstart a just-cancelled measurement / stroke
      // can still block (the guard only updates on the next render).
      if (!pinchRef.current) startPinch(e);
      const pinch = pinchRef.current;
      const page = pageRef.current;
      if (!pinch || !page || e.touches.length !== 2) return;
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const ratio = distance(a, b) / pinch.startDistance;
      pinch.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.startScale * ratio));
      pinch.clientX = (a.clientX + b.clientX) / 2;
      pinch.clientY = (a.clientY + b.clientY) / 2;
      const dx = pinch.clientX - pinch.startClientX;
      const dy = pinch.clientY - pinch.startClientY;
      page.style.transform = `translate(${dx}px, ${dy}px) scale(${pinch.scale / pinch.startScale})`;
    };

    /** Ends the CSS preview and dispatches the real zoom, keeping the anchor point in place. */
    const commit = () => {
      const pinch = pinchRef.current;
      const page = pageRef.current;
      if (!pinch) return;
      pinchRef.current = null;
      if (page) {
        page.style.transform = '';
        page.style.transformOrigin = '';
      }
      if (Math.abs(pinch.scale - pinch.startScale) < 0.01) {
        // Pan only: scroll by how far the fingers moved.
        const scroller = scrollRef.current;
        if (scroller) {
          scroller.scrollLeft -= pinch.clientX - pinch.startClientX;
          scroller.scrollTop -= pinch.clientY - pinch.startClientY;
        }
        return;
      }
      pendingAnchorRef.current = {
        x: pinch.anchorX / pinch.startScale,
        y: pinch.anchorY / pinch.startScale,
        clientX: pinch.clientX,
        clientY: pinch.clientY,
      };
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
      const page = pageRef.current;
      if (!page) return;
      e.preventDefault();
      if (!pinchRef.current) {
        const rect = page.getBoundingClientRect();
        pinchRef.current = {
          startDistance: 1,
          startScale: scaleRef.current,
          anchorX: e.clientX - rect.left,
          anchorY: e.clientY - rect.top,
          startClientX: e.clientX,
          startClientY: e.clientY,
          clientX: e.clientX,
          clientY: e.clientY,
          scale: scaleRef.current,
        };
        page.style.transformOrigin = `${e.clientX - rect.left}px ${e.clientY - rect.top}px`;
      }
      const pinch = pinchRef.current;
      pinch.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.scale * Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED)));
      page.style.transform = `scale(${pinch.scale / pinch.startScale})`;
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

  // After the zoom has been laid out, scroll so the pinched point is back under the fingers.
  useLayoutEffect(() => {
    const anchor = pendingAnchorRef.current;
    const scroller = scrollRef.current;
    const page = pageRef.current;
    if (!anchor || !scroller || !page) return;
    pendingAnchorRef.current = null;
    const rect = page.getBoundingClientRect();
    scroller.scrollLeft += rect.left + anchor.x * uiState.scale - anchor.clientX;
    scroller.scrollTop += rect.top + anchor.y * uiState.scale - anchor.clientY;
  }, [uiState.scale, scrollRef, pageRef]);
};
