import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {v4 as uuidv4} from 'uuid';
import {useDocument, useUI} from '@/lib/editor-context';
import {BLINDSPOT_COLOR, BLINDSPOT_ICON, coverageObstacles, obstacleSegments, toPathData, WALL_STROKE_WIDTH} from '@/core/camera-coverage';
import {Point, segmentLength, snapToAngle45} from '@/core/measure';

/** Snap distance to existing walls / blindspots, in screen px. */
const SNAP_PX = 12;

const projectOnSegment = (p: Point, a: Point, b: Point): Point => {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (len2 === 0) return a;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2));
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
};

/** Where the line from `o` through `q` crosses segment a–b (null = parallel / misses it). */
const crossing = (o: Point, q: Point, a: Point, b: Point): Point | null => {
  const dx = q.x - o.x, dy = q.y - o.y, ex = b.x - a.x, ey = b.y - a.y;
  const den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-12) return null;
  const u = ((a.x - o.x) * dy - (a.y - o.y) * dx) / den;
  if (u < 0 || u > 1) return null;
  return { x: a.x + u * ex, y: a.y + u * ey };
};

/**
 * Wall tool: click the corner points of a camera blindspot wall (a polyline cameras cannot see past).
 * Straight mode keeps every run at a multiple of 45°; sticky mode snaps points to the ends, corners
 * and edges of existing walls and blindspots. Clicking the last point again, a double click, Enter
 * or Esc finishes the wall; Backspace removes the last point.
 */
export const useWallDrawing = (containerRef: React.RefObject<HTMLDivElement>) => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const [points, setPoints] = useState<Point[]>([]);
  const [hover, setHover] = useState<Point | null>(null);
  const pointsRef = useRef<Point[]>([]);
  pointsRef.current = points;
  const active = uiState.tool === 'wall';

  const targets = useMemo(() => {
    const visible = new Set(docState.layers.filter(l => l.visible).map(l => l.id));
    const obstacles = coverageObstacles(docState.objects, visible);
    return { vertices: obstacles.flatMap(o => o.pts), segments: obstacleSegments(obstacles) };
  }, [docState.objects, docState.layers]);

  const latest = useRef({ scale: uiState.scale, targets, straight: uiState.wallStraight, snap: uiState.wallSnap });
  latest.current = { scale: uiState.scale, targets, straight: uiState.wallStraight, snap: uiState.wallSnap };
  const layerIdRef = useRef<string | null>(null);
  layerIdRef.current = uiState.activeLayerId ?? docState.layers[0]?.id ?? null;

  const toCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: (clientX - rect.left) / latest.current.scale, y: (clientY - rect.top) / latest.current.scale };
  }, [containerRef]);

  /** Where a click at `p` (Shift = free angle) puts the next point. */
  const resolve = useCallback((p: Point, current: Point[], free = false): Point => {
    const { scale, targets, straight, snap } = latest.current;
    const radius = SNAP_PX / scale;
    const prev = current[current.length - 1];
    const aimed = prev && straight && !free ? snapToAngle45(prev, p) : p;
    if (!snap) return aimed;

    // Ends / corners first (also the wall's own earlier points, to close it).
    let best: Point | null = null, bestD = radius;
    for (const v of [...targets.vertices, ...current.slice(0, -1)]) {
      const d = Math.min(segmentLength(v, p), segmentLength(v, aimed));
      if (d <= bestD) { best = v; bestD = d; }
    }
    if (best) return best;
    for (const [a, b] of targets.segments) {
      // Straight: stop exactly where the 45° run meets the wall; otherwise drop onto it.
      const q = prev && aimed !== p ? crossing(prev, aimed, a, b) : projectOnSegment(p, a, b);
      if (q && segmentLength(q, aimed) <= radius) return q;
    }
    return aimed;
  }, []);

  const finish = useCallback(() => {
    const current = pointsRef.current;
    if (current.length >= 2 && layerIdRef.current) {
      dispatch({
        type: 'ADD_OBJECT',
        payload: {
          id: uuidv4(), type: 'path', name: '', x: 0, y: 0, width: 0, height: 0,
          layerId: layerIdRef.current, content: BLINDSPOT_ICON, pathData: toPathData(current),
          color: BLINDSPOT_COLOR, strokeWidth: WALL_STROKE_WIDTH, rotation: 0,
        },
      });
    }
    setPoints([]);
    setHover(null);
  }, [dispatch]);

  const cancel = useCallback(() => { setPoints([]); setHover(null); }, []);

  // Another tool drops an unfinished wall.
  useEffect(() => { if (!active) cancel(); }, [active, cancel]);

  const onClick = useCallback((e: React.MouseEvent) => {
    const p = toCanvasPoint(e.clientX, e.clientY);
    if (!p) return;
    const current = pointsRef.current;
    const prev = current[current.length - 1];
    if (prev && segmentLength(prev, p) * latest.current.scale <= SNAP_PX) { finish(); return; }
    setPoints([...current, resolve(p, current, e.shiftKey)]);
  }, [toCanvasPoint, resolve, finish]);

  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => {
      if (pointsRef.current.length === 0) { setHover(null); return; }
      const p = toCanvasPoint(e.clientX, e.clientY);
      setHover(p ? resolve(p, pointsRef.current, e.shiftKey) : null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
      if (e.key === 'Enter' || e.key === 'Escape') finish();
      else if (e.key === 'Backspace' && pointsRef.current.length > 0) {
        e.preventDefault();
        setPoints(pointsRef.current.slice(0, -1));
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [active, toCanvasPoint, resolve, finish]);

  return { points, hover, onClick, finish, cancel };
};
