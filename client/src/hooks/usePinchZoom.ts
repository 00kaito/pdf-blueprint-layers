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
  clientX: number;
  clientY: number;
  scale: number;
};

const distance = (a: Touch, b: Touch) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

/**
 * Two-finger pinch zoom around the gesture midpoint.
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

    const onTouchStart = (e: TouchEvent) => {
      const page = pageRef.current;
      if (e.touches.length !== 2 || !page || isBlockedRef.current()) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      const rect = page.getBoundingClientRect();
      const clientX = (a.clientX + b.clientX) / 2;
      const clientY = (a.clientY + b.clientY) / 2;
      pinchRef.current = {
        startDistance: distance(a, b) || 1,
        startScale: scaleRef.current,
        anchorX: clientX - rect.left,
        anchorY: clientY - rect.top,
        clientX,
        clientY,
        scale: scaleRef.current,
      };
      page.style.transformOrigin = `${clientX - rect.left}px ${clientY - rect.top}px`;
    };

    const onTouchMove = (e: TouchEvent) => {
      const pinch = pinchRef.current;
      const page = pageRef.current;
      if (!pinch || !page || e.touches.length !== 2) return;
      e.preventDefault();
      const ratio = distance(e.touches[0], e.touches[1]) / pinch.startDistance;
      pinch.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.startScale * ratio));
      page.style.transform = `scale(${pinch.scale / pinch.startScale})`;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const pinch = pinchRef.current;
      const page = pageRef.current;
      if (!pinch || e.touches.length >= 2) return;
      pinchRef.current = null;
      if (page) {
        page.style.transform = '';
        page.style.transformOrigin = '';
      }
      if (Math.abs(pinch.scale - pinch.startScale) < 0.01) return;
      pendingAnchorRef.current = {
        x: pinch.anchorX / pinch.startScale,
        y: pinch.anchorY / pinch.startScale,
        clientX: pinch.clientX,
        clientY: pinch.clientY,
      };
      dispatch({ type: 'SET_SCALE', payload: pinch.scale });
    };

    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchmove', onTouchMove, { passive: false });
    scroller.addEventListener('touchend', onTouchEnd);
    scroller.addEventListener('touchcancel', onTouchEnd);
    return () => {
      scroller.removeEventListener('touchstart', onTouchStart);
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
