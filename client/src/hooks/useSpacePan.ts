import {useEffect, useRef, useState} from 'react';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  !!(target as HTMLElement | null)?.isContentEditable;

/**
 * Hold Space and drag to pan the blueprint (like in design tools), whatever tool is active.
 * While Space is held, presses on the canvas go to panning only — not to the tool, not to object drags.
 */
export const useSpacePan = (scrollRef: React.RefObject<HTMLDivElement>) => {
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const spaceRef = useRef(false);

  useEffect(() => {
    const setSpace = (down: boolean) => {
      spaceRef.current = down;
      setSpaceDown(down);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTyping(e.target)) return;
      e.preventDefault(); // no page scroll, no "click" on a focused toolbar button
      if (!e.repeat) setSpace(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTyping(e.target)) return;
      e.preventDefault();
      setSpace(false);
    };
    const onBlur = () => setSpace(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    // Capture phase on the scroller runs before React's handlers (dispatched from the root on bubble),
    // so stopping the event here keeps it away from the tools and from react-draggable.
    const swallow = (e: Event) => {
      if (!spaceRef.current) return;
      e.stopPropagation();
      e.preventDefault();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!spaceRef.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
      swallow(e);
      const start = { x: e.clientX, y: e.clientY, left: scroller.scrollLeft, top: scroller.scrollTop, id: e.pointerId };
      setPanning(true);
      const onMove = (m: PointerEvent) => {
        if (m.pointerId !== start.id) return;
        scroller.scrollLeft = start.left - (m.clientX - start.x);
        scroller.scrollTop = start.top - (m.clientY - start.y);
      };
      const onUp = (u: PointerEvent) => {
        if (u.pointerId !== start.id) return;
        setPanning(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };

    scroller.addEventListener('pointerdown', onPointerDown, true);
    scroller.addEventListener('mousedown', swallow, true);
    scroller.addEventListener('touchstart', swallow, true);
    scroller.addEventListener('click', swallow, true);
    return () => {
      scroller.removeEventListener('pointerdown', onPointerDown, true);
      scroller.removeEventListener('mousedown', swallow, true);
      scroller.removeEventListener('touchstart', swallow, true);
      scroller.removeEventListener('click', swallow, true);
    };
  }, [scrollRef]);

  return { spaceDown, panning };
};
