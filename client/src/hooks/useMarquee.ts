import {useCallback, useEffect, useRef, useState} from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {objectsInRect, Rect, rectFromPoints} from '@/core/marquee';

/** Pointer travel (screen px) before a press on empty canvas becomes a selection rectangle. */
const MIN_DRAG_PX = 4;

/**
 * Presses on these start their own interaction (object drag, label, handles, buttons, dialogs), not a
 * rectangle. Paint-bucket fills are the exception: they cover whole rooms, and are never dragged.
 */
export const MARQUEE_IGNORE = '.react-draggable:not(.is-fill), .object-label, button, input, textarea, select, a, [role="dialog"], [data-no-marquee]';

/**
 * Select tool: drag on empty canvas to draw a selection rectangle. Mouse and stylus only — a finger
 * scrolls the blueprint in the select tool. Shift / Ctrl / ⌘ adds to the current selection.
 */
export const useMarquee = (containerRef: React.RefObject<HTMLDivElement>) => {
  const { state: docState } = useDocument();
  const { state: uiState, dispatch } = useUI();
  /** Rectangle being dragged, unscaled canvas units (null until the pointer has really moved). */
  const [rect, setRect] = useState<Rect | null>(null);
  const [active, setActive] = useState(false);
  const dragRef = useRef<{ id: number; start: { x: number; y: number }; startClient: { x: number; y: number }; additive: boolean; moved: boolean } | null>(null);

  const latest = useRef({ scale: uiState.scale, objects: docState.objects, layers: docState.layers, selected: uiState.selectedObjectIds });
  latest.current = { scale: uiState.scale, objects: docState.objects, layers: docState.layers, selected: uiState.selectedObjectIds };

  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return null;
    const { scale } = latest.current;
    return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale };
  }, [containerRef]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) return;
    if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const target = e.target as Element;
    // Anywhere in the canvas area, the grey margin around the page included.
    if (target.closest(MARQUEE_IGNORE)) return;
    const start = toCanvasPoint(e.clientX, e.clientY);
    if (!start) return;
    // No text selection / stylus scroll while dragging the rectangle.
    e.preventDefault();
    dragRef.current = {
      id: e.pointerId, start, startClient: { x: e.clientX, y: e.clientY },
      additive: e.shiftKey || e.ctrlKey || e.metaKey, moved: false,
    };
    setActive(true);
  }, [containerRef, toCanvasPoint]);

  useEffect(() => {
    if (!active) return;
    const current = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.id) return null;
      const p = toCanvasPoint(e.clientX, e.clientY);
      return p ? { drag, r: rectFromPoints(drag.start, p) } : null;
    };
    const handleMove = (e: PointerEvent) => {
      const c = current(e);
      if (!c) return;
      if (!c.drag.moved && Math.hypot(e.clientX - c.drag.startClient.x, e.clientY - c.drag.startClient.y) < MIN_DRAG_PX) return;
      c.drag.moved = true;
      setRect(c.r);
    };
    const end = (e: PointerEvent, commit: boolean) => {
      const c = current(e);
      if (!c) return;
      dragRef.current = null;
      setActive(false);
      setRect(null);
      if (!commit) return;
      if (!c.drag.moved) {
        // A plain press on empty canvas deselects. The canvas click handler does too, but Safari sends
        // no click for a stylus whose touchstart was cancelled (to stop it scrolling).
        if (!c.drag.additive) dispatch({ type: 'SET_SELECTION', payload: [] });
        return;
      }
      // The click that ends the drag must not deselect again or select the fill it ended on. It follows
      // pointerup synchronously, so swallow clicks until the next task (a missing one eats nothing).
      const swallow = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener('click', swallow, true);
      setTimeout(() => window.removeEventListener('click', swallow, true), 0);
      const { objects, layers, selected } = latest.current;
      const picked = objectsInRect(objects, layers, c.r);
      const next = c.drag.additive ? Array.from(new Set([...selected, ...picked])) : picked;
      dispatch({ type: 'SET_SELECTION', payload: next });
    };
    const handleUp = (e: PointerEvent) => end(e, true);
    const handleCancel = (e: PointerEvent) => end(e, false);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, [active, toCanvasPoint, dispatch]);

  return { rect, isSelecting: active, onPointerDown };
};
