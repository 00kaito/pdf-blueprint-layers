import {useCallback, useEffect, useRef, useState} from 'react';
import {useUI} from '@/lib/editor-context';
import {Point, snapToAngle45} from '@/core/measure';

/** Holding a finger (or the mouse button) this long without moving removes the measurement. */
export const PATH_MEASURE_HOLD_MS = 600;
/** Movement (screen px) that makes a press a pan / drag instead of a tap or a hold. */
const SLOP_PX = 10;

/**
 * Path measure: every click / tap on the plan adds the next point; the measurement joins them and
 * shows each segment and the total. A drag still pans (it is not a tap), holding a finger still
 * removes the measurement, and so do its ✕ and (keyboard) Esc; Backspace takes back the last point. Shift (or the
 * "straight" drawing mode) keeps segments at multiples of 45°.
 *
 * The points live in UIState (this screen only, never saved), so the measurement stays on the plan after
 * leaving the tool, like the measuring tape.
 */
export const usePathMeasure = (containerRef: React.RefObject<HTMLDivElement>) => {
  const { state: uiState, dispatch } = useUI();
  const active = uiState.tool === 'path-measure';
  const [hover, setHover] = useState<Point | null>(null);
  const latest = useRef({ points: uiState.pathMeasure, scale: uiState.scale, straight: uiState.drawStraight });
  latest.current = { points: uiState.pathMeasure, scale: uiState.scale, straight: uiState.drawStraight };
  const holdRef = useRef<{ id: number; x: number; y: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  /** After a hold removed the measurement, the click the release produces must not start a new one. */
  const ignoreClickUntilRef = useRef(0);

  const toCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: (clientX - rect.left) / latest.current.scale, y: (clientY - rect.top) / latest.current.scale };
  }, [containerRef]);

  const aim = useCallback((p: Point, free: boolean): Point => {
    const { points, straight } = latest.current;
    const prev = points[points.length - 1];
    return prev && !free && straight ? snapToAngle45(prev, p) : p;
  }, []);

  const setPoints = useCallback((points: Point[]) => dispatch({ type: 'SET_PATH_MEASURE', payload: points }), [dispatch]);
  const clear = useCallback(() => { setPoints([]); setHover(null); }, [setPoints]);

  const cancelHold = () => {
    if (holdRef.current) clearTimeout(holdRef.current.timer);
    holdRef.current = null;
  };

  /** Click / tap on the plan: the next point. */
  const onClick = useCallback((e: React.MouseEvent) => {
    if (Date.now() < ignoreClickUntilRef.current) return;
    const p = toCanvasPoint(e.clientX, e.clientY);
    if (!p) return;
    // Shift: straight segments (or free ones, when the straight mode is on).
    const free = e.shiftKey ? latest.current.straight : !latest.current.straight;
    const q = free ? p : (latest.current.points.length ? snapToAngle45(latest.current.points[latest.current.points.length - 1], p) : p);
    setPoints([...latest.current.points, q]);
  }, [toCanvasPoint, setPoints]);

  /** Press on the plan: starts the "hold to remove" timer. */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    cancelHold();
    // A finger (or pen) hold; with a mouse it is ✕ / Esc (a slow click must not wipe the measurement).
    if (!e.isPrimary || e.pointerType === 'mouse') return;
    const timer = setTimeout(() => {
      holdRef.current = null;
      if (latest.current.points.length === 0) return;
      clear();
      ignoreClickUntilRef.current = Date.now() + 800;
      try { navigator.vibrate?.(30); } catch { /* not supported */ }
    }, PATH_MEASURE_HOLD_MS);
    holdRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, timer };
  }, [clear]);

  useEffect(() => {
    if (!active) { cancelHold(); setHover(null); return; }
    const onMove = (e: PointerEvent) => {
      const hold = holdRef.current;
      if (hold && (e.pointerId !== hold.id || Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > SLOP_PX)) cancelHold();
      // Preview of the next segment follows the mouse (a finger has no hover).
      if (e.pointerType === 'mouse' && latest.current.points.length) {
        const p = toCanvasPoint(e.clientX, e.clientY);
        const free = e.shiftKey ? latest.current.straight : !latest.current.straight;
        setHover(p ? (free ? p : aim(p, false)) : null);
      }
    };
    const onEnd = () => cancelHold();
    const onOtherDown = (e: PointerEvent) => { if (holdRef.current && e.pointerId !== holdRef.current.id) cancelHold(); };
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
      if (e.key === 'Backspace' && latest.current.points.length) {
        e.preventDefault();
        setPoints(latest.current.points.slice(0, -1));
      } else if (e.key === 'Escape') {
        clear();
      }
    };
    // A long press must not open the browser's context menu (Android) while measuring.
    const onContextMenu = (e: MouseEvent) => {
      if (containerRef.current?.closest('[data-canvas-scroller]')?.contains(e.target as Node)) e.preventDefault();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    window.addEventListener('pointerdown', onOtherDown, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', onEnd);
    return () => {
      cancelHold();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      window.removeEventListener('pointerdown', onOtherDown, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', onEnd);
    };
  }, [active, toCanvasPoint, aim, clear, setPoints, containerRef]);

  // Scrolling (a finger pan, the wheel) is not a hold.
  useEffect(() => {
    const scroller = containerRef.current?.closest('[data-canvas-scroller]');
    if (!active || !scroller) return;
    const onScroll = () => cancelHold();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [active, containerRef]);

  return { points: uiState.pathMeasure, hover: active ? hover : null, onClick, onPointerDown, clear };
};
