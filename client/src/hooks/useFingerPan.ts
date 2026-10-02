import {useEffect, useRef, useState} from 'react';

/**
 * One-finger panning used while a stroke tool is in stylus-only mode.
 *
 * The drawing surface uses `touch-action: none` so Safari cannot turn an Apple Pencil stroke into
 * viewport panning and cancel its pointer stream. CSS cannot distinguish a finger from a pen, so
 * finger panning is implemented here with Pointer Events instead of native scrolling.
 */
export const useFingerPan = (
  scrollRef: React.RefObject<HTMLDivElement>,
  enabled: boolean,
  isBlocked: () => boolean,
) => {
  const [panning, setPanning] = useState(false);
  const enabledRef = useRef(enabled);
  const blockedRef = useRef(isBlocked);
  enabledRef.current = enabled;
  blockedRef.current = isBlocked;

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const touches = new Set<number>();
    let pan: { id: number; x: number; y: number; left: number; top: number } | null = null;

    const stopPan = () => {
      if (!pan) return;
      try {
        if (scroller.hasPointerCapture(pan.id)) scroller.releasePointerCapture(pan.id);
      } catch { /* pointer already ended */ }
      pan = null;
      setPanning(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      touches.add(e.pointerId);

      // Two fingers belong to usePinchZoom. Stop a pending one-finger pan immediately.
      if (touches.size > 1) {
        stopPan();
        return;
      }
      if (!enabledRef.current || blockedRef.current()) return;

      e.preventDefault();
      e.stopPropagation();
      try { scroller.setPointerCapture(e.pointerId); } catch { /* older Safari */ }
      pan = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        left: scroller.scrollLeft,
        top: scroller.scrollTop,
      };
      setPanning(true);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pan || e.pointerId !== pan.id) return;
      e.preventDefault();
      scroller.scrollLeft = pan.left - (e.clientX - pan.x);
      scroller.scrollTop = pan.top - (e.clientY - pan.y);
    };

    const onPointerEnd = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (pan?.id === e.pointerId) stopPan();
    };
    // Only the scroller losing its capture ends the pan — Safari also fires this for the implicit
    // capture on the element first touched when we take the capture over (that is not an end).
    const onLostCapture = (e: PointerEvent) => {
      if (e.target === scroller && pan?.id === e.pointerId) stopPan();
    };

    // Capture phase runs before React's canvas handler, so a finger assigned to panning cannot also
    // start a tool. Pen events pass through unchanged.
    scroller.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, {passive: false});
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
    window.addEventListener('lostpointercapture', onLostCapture);
    return () => {
      scroller.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
      window.removeEventListener('lostpointercapture', onLostCapture);
      pan = null;
      touches.clear();
    };
  }, [scrollRef]);

  return {panning};
};
