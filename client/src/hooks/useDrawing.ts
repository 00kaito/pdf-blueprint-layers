import {useCallback, useEffect, useRef, useState} from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {v4 as uuidv4} from 'uuid';
import {CANVAS_BASE_WIDTH} from '@/core/constants';

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

  // Latest values for the window listeners, which live for the whole stroke.
  const snapshot = () => ({
    scale: uiState.scale,
    activeLayerId: uiState.activeLayerId,
    pdfCanvasHeight: docState.pdfCanvasHeight,
    color: uiState.drawColor,
    strokeWidth: uiState.drawStrokeWidth,
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

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || uiState.tool !== 'draw' || !uiState.activeLayerId) return;
    const start = toCanvasPoint(e.clientX, e.clientY);
    if (!start) return;
    e.preventDefault();
    pointsRef.current = [start];
    setDrawingPath(toPathData(pointsRef.current));
    setIsDrawing(true);
  }, [uiState.tool, uiState.activeLayerId, toCanvasPoint]);

  // Track the stroke on window so it continues (and ends) when the pointer leaves the canvas.
  useEffect(() => {
    if (!isDrawing) return;

    const handleMove = (e: MouseEvent) => {
      const points = pointsRef.current;
      let p = toCanvasPoint(e.clientX, e.clientY);
      if (!p || points.length === 0) return;

      if (e.shiftKey) {
        // Shift: straight horizontal / vertical line from the stroke start.
        const start = points[0];
        p = Math.abs(p.x - start.x) > Math.abs(p.y - start.y) ? { x: p.x, y: start.y } : { x: start.x, y: p.y };
        pointsRef.current = [start, p];
      } else {
        const last = points[points.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) < MIN_POINT_DISTANCE) return;
        pointsRef.current = [...points, p];
      }
      setDrawingPath(toPathData(pointsRef.current));
    };

    const handleUp = () => {
      const points = pointsRef.current;
      const { activeLayerId, pdfCanvasHeight, color, strokeWidth, dispatch } = latest.current;
      pointsRef.current = [];
      setIsDrawing(false);
      setDrawingPath('');
      if (points.length < 2 || !activeLayerId) return;
      dispatch({
        type: 'ADD_OBJECT',
        payload: {
          id: uuidv4(), type: 'path', name: '', x: 0, y: 0,
          width: CANVAS_BASE_WIDTH, height: pdfCanvasHeight,
          layerId: activeLayerId, pathData: toPathData(points), color, strokeWidth
        }
      });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDrawing, toCanvasPoint]);

  return { drawingPath, isDrawing, onMouseDown };
};
