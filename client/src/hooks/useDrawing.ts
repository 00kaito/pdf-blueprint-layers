import {useCallback, useEffect, useRef, useState} from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {v4 as uuidv4} from 'uuid';
import {CANVAS_BASE_WIDTH} from '@/core/constants';
import {canDrawWith} from '@/core/pointer-input';

type Point = { x: number; y: number };

/** Ignore pointer jitter smaller than this (unscaled canvas units) when adding stroke points. */
const MIN_POINT_DISTANCE = 0.3;

const round = (v: number) => Math.round(v * 100) / 100;

/** Serialises points as "M x y L x y …" — the format expected by the renderer and the PDF export. */
const toPathData = (points: Point[]) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p.x)} ${round(p.y)}`).join(' ');

export const useDrawing = (containerRef: React.RefObject<HTMLDivElement>) => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const [drawingPath, setDrawingPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const pointsRef = useRef<Point[]>([]);
  /** Pointer that owns the current stroke; other pointers (e.g. a resting palm) are ignored. */
  const pointerIdRef = useRef<number | null>(null);
  const pointerTypeRef = useRef<string>('');

  // Latest values for the window listeners, which live for the whole stroke.
  const snapshot = () => ({
    scale: uiState.scale,
    activeLayerId: uiState.activeLayerId,
    pdfCanvasHeight: docState.pdfCanvasHeight,
    color: uiState.drawColor,
    strokeWidth: uiState.drawStrokeWidth,
    straight: uiState.drawStraight,
    dispatch,
  });
  const latest = useRef(snapshot());
  latest.current = snapshot();

  const toCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const { scale } = latest.current;
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  }, [containerRef]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (uiState.tool !== 'draw' || !uiState.activeLayerId) return;
    if (pointerIdRef.current !== null || !canDrawWith(e, uiState.ipadMode)) return;
    const start = toCanvasPoint(e.clientX, e.clientY);
    if (!start) return;
    e.preventDefault();
    pointerIdRef.current = e.pointerId;
    pointerTypeRef.current = e.pointerType;
    pointsRef.current = [start];
    setDrawingPath(toPathData(pointsRef.current));
    setIsDrawing(true);
  }, [uiState.tool, uiState.activeLayerId, uiState.ipadMode, toCanvasPoint]);

  // Track the stroke on window so it continues (and ends) when the pointer leaves the canvas.
  useEffect(() => {
    if (!isDrawing) return;

    const addPoint = (clientX: number, clientY: number, straight: boolean) => {
      const points = pointsRef.current;
      let p = toCanvasPoint(clientX, clientY);
      if (!p || points.length === 0) return;

      if (straight) {
        // Straight horizontal / vertical line from the stroke start.
        const start = points[0];
        p = Math.abs(p.x - start.x) > Math.abs(p.y - start.y) ? { x: p.x, y: start.y } : { x: start.x, y: p.y };
        pointsRef.current = [start, p];
      } else {
        const last = points[points.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) < MIN_POINT_DISTANCE) return;
        pointsRef.current = [...points, p];
      }
    };

    const handleMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return;
      const straight = e.shiftKey || latest.current.straight;
      // A stylus reports far more samples than frames; coalesced events keep curves smooth.
      const samples = e.getCoalescedEvents?.() ?? [];
      for (const s of samples.length > 0 ? samples : [e]) addPoint(s.clientX, s.clientY, straight);
      setDrawingPath(toPathData(pointsRef.current));
    };

    const finish = (commit: boolean) => {
      const points = pointsRef.current;
      const { activeLayerId, pdfCanvasHeight, color, strokeWidth, dispatch } = latest.current;
      pointerIdRef.current = null;
      pointsRef.current = [];
      setIsDrawing(false);
      setDrawingPath('');
      if (!commit || points.length < 2 || !activeLayerId) return;
      dispatch({
        type: 'ADD_OBJECT',
        payload: {
          id: uuidv4(), type: 'path', name: '', x: 0, y: 0,
          width: CANVAS_BASE_WIDTH, height: pdfCanvasHeight,
          layerId: activeLayerId, pathData: toPathData(points), color, strokeWidth
        }
      });
    };

    const handleUp = (e: PointerEvent) => { if (e.pointerId === pointerIdRef.current) finish(true); };
    // A second finger joining a finger stroke means a pinch, not drawing. (A palm next to a stylus stroke is ignored.)
    const handleOtherDown = (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current && e.pointerType === 'touch' && pointerTypeRef.current === 'touch') finish(false);
    };
    // The browser took over the pointer (e.g. started scrolling) — drop the unfinished stroke.
    const handleCancel = (e: PointerEvent) => { if (e.pointerId === pointerIdRef.current) finish(false); };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener('pointerdown', handleOtherDown, true);
    return () => {
      window.removeEventListener('pointerdown', handleOtherDown, true);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, [isDrawing, toCanvasPoint]);

  return { drawingPath, isDrawing, onPointerDown };
};
