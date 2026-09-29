import {useCallback, useEffect, useRef, useState} from 'react';
import {useUI} from '@/lib/editor-context';
import {canDrawWith} from '@/core/pointer-input';
import {Point, segmentLength, snapToAxis} from '@/core/measure';

export type MeasureLine = { a: Point; b: Point };

/** Lines shorter than this on screen (px) are treated as a click, not a measurement. */
const MIN_SCREEN_LENGTH = 4;

/**
 * Pointer handling for the calibration tool and the measuring tape. Both draw a straight line
 * from press to release (Shift = horizontal / vertical). Points are kept in unscaled canvas units,
 * so a calibration made at one zoom level measures correctly at any other.
 */
export const useMeasure = (containerRef: React.RefObject<HTMLDivElement>) => {
  const { state: uiState } = useUI();
  /** Line being dragged, or the last measurement (kept on screen until the next one). */
  const [line, setLine] = useState<MeasureLine | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  /** Calibration line waiting for the user to type its real length. */
  const [pendingCalibration, setPendingCalibration] = useState<MeasureLine | null>(null);
  const pointerRef = useRef<{ id: number; type: string } | null>(null);
  const lineRef = useRef<MeasureLine | null>(null);

  const latest = useRef({ scale: uiState.scale, tool: uiState.tool, straight: uiState.drawStraight });
  latest.current = { scale: uiState.scale, tool: uiState.tool, straight: uiState.drawStraight };

  const toCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const { scale } = latest.current;
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  }, [containerRef]);

  const updateLine = (next: MeasureLine | null) => {
    lineRef.current = next;
    setLine(next);
  };

  // A new tool starts with a clean slate.
  useEffect(() => {
    updateLine(null);
    setPendingCalibration(null);
  }, [uiState.tool]);

  // Esc clears the measurement on screen.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lineRef.current && !pointerRef.current) updateLine(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (uiState.tool !== 'measure' && uiState.tool !== 'calibrate') return;
    if (pointerRef.current || pendingCalibration || !canDrawWith(e, uiState.ipadMode)) return;
    const start = toCanvasPoint(e.clientX, e.clientY);
    if (!start) return;
    e.preventDefault();
    pointerRef.current = { id: e.pointerId, type: e.pointerType };
    updateLine({ a: start, b: start });
    setIsMeasuring(true);
  }, [uiState.tool, uiState.ipadMode, pendingCalibration, toCanvasPoint]);

  useEffect(() => {
    if (!isMeasuring) return;

    const finish = (commit: boolean) => {
      const current = lineRef.current;
      pointerRef.current = null;
      setIsMeasuring(false);
      const { scale, tool } = latest.current;
      const tooShort = !current || segmentLength(current.a, current.b) * scale < MIN_SCREEN_LENGTH;
      if (!commit || tooShort) {
        updateLine(null);
        return;
      }
      if (tool === 'calibrate') setPendingCalibration(current);
    };

    const handleMove = (e: PointerEvent) => {
      const current = lineRef.current;
      if (e.pointerId !== pointerRef.current?.id || !current) return;
      const p = toCanvasPoint(e.clientX, e.clientY);
      if (!p) return;
      const straight = e.shiftKey || latest.current.straight;
      updateLine({ a: current.a, b: straight ? snapToAxis(current.a, p) : p });
    };
    const handleUp = (e: PointerEvent) => { if (e.pointerId === pointerRef.current?.id) finish(true); };
    const handleCancel = (e: PointerEvent) => { if (e.pointerId === pointerRef.current?.id) finish(false); };
    // A second finger joining a finger drag means a pinch, not a measurement.
    const handleOtherDown = (e: PointerEvent) => {
      const own = pointerRef.current;
      if (own && e.pointerId !== own.id && e.pointerType === 'touch' && own.type === 'touch') finish(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener('pointerdown', handleOtherDown, true);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('pointerdown', handleOtherDown, true);
    };
  }, [isMeasuring, toCanvasPoint]);

  const clearPendingCalibration = useCallback(() => {
    setPendingCalibration(null);
    updateLine(null);
  }, []);

  return { line, isMeasuring, pendingCalibration, clearPendingCalibration, onPointerDown };
};
