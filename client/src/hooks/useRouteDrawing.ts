import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {v4 as uuidv4} from 'uuid';
import {useDocument, useUI} from '@/lib/editor-context';
import {centerOf, effectiveRouteRack, getRacks, routesForRack} from '@/core/cable-routing';
import {Point, segmentLength, snapToAxis} from '@/core/measure';

/** Snap distance to existing route points / racks, in screen px. */
const SNAP_PX = 12;

const projectOnSegment = (p: Point, a: Point, b: Point): Point => {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (len2 === 0) return a;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2));
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
};

/**
 * Route tool: click control points of a cable route. Runs are always horizontal / vertical — a point
 * off the line of the previous one gets a corner inserted. Points snap to racks and to existing
 * routes (a route starting on another one branches off it). Clicking the last point again, a double
 * click, Enter or Esc finishes the route; Backspace removes the last point.
 */
export const useRouteDrawing = (containerRef: React.RefObject<HTMLDivElement>) => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const [points, setPoints] = useState<Point[]>([]);
  const [hover, setHover] = useState<Point | null>(null);
  const pointsRef = useRef<Point[]>([]);
  pointsRef.current = points;
  const active = uiState.tool === 'route';

  const racks = useMemo(() => getRacks(docState.objects), [docState.objects]);
  /** IDF the new route belongs to (undefined = shared by all). */
  const rackId = effectiveRouteRack(uiState.routeRackId, racks);

  // Snaps only to this IDF's routes (and shared ones) and to its own rack — a red route never joins a blue one.
  const targets = useMemo(() => {
    const rackIds = new Set(racks.map(r => r.id));
    const routes = rackId ? routesForRack(docState.cableRoutes, rackId, rackIds) : docState.cableRoutes;
    return {
      vertices: [
        ...routes.flatMap(r => r.points),
        ...racks.filter(r => !rackId || r.id === rackId).map(centerOf),
      ],
      segments: routes.flatMap(r => r.points.slice(1).map((b, i) => [r.points[i], b] as const)),
    };
  }, [docState.cableRoutes, racks, rackId]);
  const rackIdRef = useRef(rackId);
  rackIdRef.current = rackId;

  const latest = useRef({ scale: uiState.scale, targets });
  latest.current = { scale: uiState.scale, targets };

  const toCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: (clientX - rect.left) / latest.current.scale, y: (clientY - rect.top) / latest.current.scale };
  }, [containerRef]);

  /** Where a click at `p` puts the next point. */
  const resolve = useCallback((p: Point, current: Point[]): { point: Point; snapped: boolean } => {
    const { scale, targets } = latest.current;
    const radius = SNAP_PX / scale;
    let best: Point | null = null, bestD = radius;
    for (const v of [...targets.vertices, ...current.slice(0, -1)]) {
      const d = segmentLength(v, p);
      if (d <= bestD) { best = v; bestD = d; }
    }
    if (best) return { point: best, snapped: true };
    const prev = current[current.length - 1];
    if (!prev) {
      // Branch off an existing route anywhere along it.
      for (const [a, b] of targets.segments) {
        const q = projectOnSegment(p, a, b);
        if (segmentLength(q, p) <= radius) return { point: q, snapped: true };
      }
      return { point: p, snapped: false };
    }
    return { point: snapToAxis(prev, p), snapped: false };
  }, []);

  const finish = useCallback(() => {
    const current = pointsRef.current;
    if (current.length >= 2) {
      dispatch({ type: 'ADD_CABLE_ROUTE', payload: { id: uuidv4(), points: current, rackId: rackIdRef.current } });
    }
    setPoints([]);
    setHover(null);
  }, [dispatch]);

  const cancel = useCallback(() => { setPoints([]); setHover(null); }, []);

  // Another tool drops an unfinished route.
  useEffect(() => { if (!active) cancel(); }, [active, cancel]);

  const onClick = useCallback((e: React.MouseEvent) => {
    const p = toCanvasPoint(e.clientX, e.clientY);
    if (!p) return;
    const current = pointsRef.current;
    const prev = current[current.length - 1];
    if (prev && segmentLength(prev, p) * latest.current.scale <= SNAP_PX) { finish(); return; }
    const { point } = resolve(p, current);
    const next = [...current];
    // Snapped off the line of the previous point: go sideways first, then straight to it.
    if (prev && Math.abs(prev.x - point.x) > 1e-6 && Math.abs(prev.y - point.y) > 1e-6) next.push({ x: point.x, y: prev.y });
    next.push(point);
    setPoints(next);
  }, [toCanvasPoint, resolve, finish]);

  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => {
      if (pointsRef.current.length === 0) { setHover(null); return; }
      const p = toCanvasPoint(e.clientX, e.clientY);
      setHover(p ? resolve(p, pointsRef.current).point : null);
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

  return { points, hover, onClick, finish, cancel, rackId };
};
