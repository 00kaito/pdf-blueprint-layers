import type {EditorObject} from '@/lib/types';
import {BLINDSPOT_ICON, deviceKey} from './lv-icons';
import type {Point} from './measure';

/** What a CCTV camera sees: a sector in front of it, cut off behind blindspot obstacles (walls are not taken into account). */
export const DEFAULT_CAMERA_RANGE_FT = 25;
export const DEFAULT_CAMERA_ANGLE_DEG = 100;
/** Up to here the picture is sharp (darker zone); beyond it, up to the range, lighter. */
export const CAMERA_NEAR_FT = 15;
export const COVERAGE_NEAR = '#0369a1';
export const COVERAGE_FAR = '#38bdf8';
/** Fill opacity: the plan stays readable under the zones. */
export const COVERAGE_OPACITY = 0.1;

export const isCamera = (o: EditorObject) => deviceKey(o) === 'cctv';

export {BLINDSPOT_ICON};
/** Blindspots (shelves, columns, wall pieces) are drawn in this colour, hatched. */
export const BLINDSPOT_COLOR = '#64748b';

export const isBlindspot = (o: EditorObject) => o.type === 'icon' && o.content === BLINDSPOT_ICON && !o.isFill;

/** Blindspot wall: a polyline drawn with the wall tool (a 'path' object), for long walls. */
export const isBlindspotWall = (o: EditorObject) => o.type === 'path' && o.content === BLINDSPOT_ICON && !!o.pathData;

/** Stroke width of a new wall, unscaled canvas units. */
export const WALL_STROKE_WIDTH = 2.5;

/** Points of a stored path ("M x y L x y …"). */
export const pathPoints = (pathData: string): Point[] => {
  const n = (pathData.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
  const pts: Point[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push({ x: n[i], y: n[i + 1] });
  return pts;
};

export const toPathData = (pts: Point[]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'} ${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`).join(' ');

/** Something cameras cannot see past: a blindspot box (closed) or a wall (open polyline). */
export type Obstacle = { pts: Point[]; closed: boolean };

/** Corners of an object's box, rotated with it around its centre. */
export const boxCorners = (o: EditorObject): Point[] => {
  const cx = o.x + o.width / 2, cy = o.y + o.height / 2;
  const a = ((o.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const dx = (sx * o.width) / 2, dy = (sy * o.height) / 2;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  });
};

/** Blindspot boxes and walls that block the view: visible layer, not being removed. */
export const coverageObstacles = (objects: EditorObject[], visibleLayerIds?: Set<string>): Obstacle[] =>
  objects
    .filter(o => (isBlindspot(o) || isBlindspotWall(o)) && o.change !== 'REMOVE' && (!visibleLayerIds || visibleLayerIds.has(o.layerId)))
    .map(o => (o.type === 'path' ? { pts: pathPoints(o.pathData!), closed: false } : { pts: boxCorners(o), closed: true }));

/** Every edge of the obstacles, as [a, b] segments. */
export const obstacleSegments = (obstacles: Obstacle[]): [Point, Point][] =>
  obstacles.flatMap(({ pts, closed }) => {
    const n = closed ? pts.length : pts.length - 1;
    return Array.from({ length: Math.max(0, n) }, (_, i) => [pts[i], pts[(i + 1) % pts.length]] as [Point, Point]);
  });

export const cameraSpec = (o: EditorObject) => ({
  rangeFt: o.camera?.rangeFt || DEFAULT_CAMERA_RANGE_FT,
  angleDeg: o.camera?.angleDeg || DEFAULT_CAMERA_ANGLE_DEG,
});

export type Coverage = {
  center: Point;
  /** Viewing direction in radians (0 = right, clockwise with y down, like CSS rotate). */
  dir: number;
  /** Half of the view angle, radians. */
  half: number;
  nearR: number;
  farR: number;
};

/**
 * Coverage in plan units, or null without a measuring scale. The cctv icon's lens points right,
 * so at rotation 0 the camera looks along +x; it turns with the icon around its centre.
 */
export const coverageOf = (o: EditorObject, ftPerUnit: number | null): Coverage | null => {
  if (!ftPerUnit) return null;
  const { rangeFt, angleDeg } = cameraSpec(o);
  const farR = rangeFt / ftPerUnit;
  return {
    center: { x: o.x + o.width / 2, y: o.y + o.height / 2 },
    dir: ((o.rotation || 0) * Math.PI) / 180,
    half: (Math.min(angleDeg, 360) * Math.PI) / 360,
    nearR: Math.min(CAMERA_NEAR_FT, rangeFt) / ftPerUnit,
    farR,
  };
};

/** Points of the arc of radius r across the view angle, from one edge to the other. */
export const arcPoints = (c: Coverage, r: number, steps = 32): Point[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = c.dir - c.half + (2 * c.half * i) / steps;
    return { x: c.center.x + r * Math.cos(a), y: c.center.y + r * Math.sin(a) };
  });

const insidePolygon = (p: Point, poly: Point[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};

/** Distance along the ray from `o` in direction (dx, dy) to the nearest obstacle edge (Infinity = none). */
const rayHit = (o: Point, dx: number, dy: number, segments: [Point, Point][]) => {
  let best = Infinity;
  for (const [a, b] of segments) {
    const ex = b.x - a.x, ey = b.y - a.y;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((a.x - o.x) * ey - (a.y - o.y) * ex) / den;
    const u = ((a.x - o.x) * dy - (a.y - o.y) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
  }
  return best;
};

/** Rays across the view: evenly spread, plus just either side of every obstacle corner for sharp shadow edges. */
const rayAngles = (c: Coverage, obstacles: Obstacle[], steps: number) => {
  const span = 2 * c.half;
  const full = span >= Math.PI * 2 - 1e-9;
  const start = c.dir - c.half;
  const rel = new Set<number>();
  for (let i = 0; i <= steps; i++) rel.add((span * i) / steps);
  const EPS = 1e-4;
  for (const { pts } of obstacles) {
    for (const p of pts) {
      const base = Math.atan2(p.y - c.center.y, p.x - c.center.x) - start;
      for (const d of [-EPS, 0, EPS]) {
        const r = (((base + d) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (r <= span) rel.add(r);
      }
    }
  }
  const sorted = Array.from(rel).sort((a, b) => a - b);
  // A full circle closes on itself: the duplicate end ray would only add a seam.
  return (full ? sorted.filter(r => r < span - 1e-9) : sorted).map(r => start + r);
};

/**
 * The two zones as closed polygons: near sector (0–15 ft) and the far band (15 ft – range), both
 * cut off behind blindspot obstacles. An obstacle the camera sits inside is ignored.
 */
export const coverageZones = (c: Coverage, obstacles: Obstacle[] = []): { near: Point[]; far: Point[] | null } => {
  const full = c.half * 2 >= Math.PI * 2;
  const blocking = obstacles.filter(o => !o.closed || !insidePolygon(c.center, o.pts));
  const segments = obstacleSegments(blocking);
  if (blocking.length === 0) {
    const nearArc = arcPoints(c, c.nearR);
    return {
      near: full ? nearArc : [c.center, ...nearArc],
      far: c.farR > c.nearR ? [...arcPoints(c, c.farR), ...nearArc.slice().reverse()] : null,
    };
  }
  const rays = rayAngles(c, blocking, 64).map(a => {
    const dx = Math.cos(a), dy = Math.sin(a);
    const hit = rayHit(c.center, dx, dy, segments);
    const at = (r: number) => ({ x: c.center.x + dx * r, y: c.center.y + dy * r });
    return { near: at(Math.min(c.nearR, hit)), far: at(Math.min(c.farR, hit)) };
  });
  const nearArc = rays.map(r => r.near);
  return {
    near: full ? nearArc : [c.center, ...nearArc],
    far: c.farR > c.nearR ? [...rays.map(r => r.far), ...nearArc.slice().reverse()] : null,
  };
};

/** Cameras whose coverage is drawn: visible layer, not being removed. */
export const coverageCameras = (objects: EditorObject[], visibleLayerIds?: Set<string>) =>
  objects.filter(o => isCamera(o) && o.change !== 'REMOVE' && (!visibleLayerIds || visibleLayerIds.has(o.layerId)));
