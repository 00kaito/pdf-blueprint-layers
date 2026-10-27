import type {EditorObject} from '@/lib/types';
import {BLINDSPOT_ICON, CAMERA_360_ICON, COVERAGE_AREA_ICON, deviceKey} from './lv-icons';
import type {Point} from './measure';
import polygonClipping, {type Polygon} from 'polygon-clipping';

/** What a CCTV camera sees: a sector in front of it, cut off behind blindspot obstacles (walls are not taken into account). */
export const DEFAULT_CAMERA_RANGE_FT = 30;
export const DEFAULT_CAMERA_ANGLE_DEG = 110;
/** 360° (fisheye) camera defaults: all around, 18 ft. */
export const CAMERA_360_RANGE_FT = 18;
export const CAMERA_360_ANGLE_DEG = 360;
/** Up to here the picture is sharp (darker zone); beyond it, up to the range, lighter. */
export const CAMERA_NEAR_FT = 15;
export const COVERAGE_NEAR = '#0369a1';
export const COVERAGE_FAR = '#38bdf8';
/** Fill opacity: the plan stays readable under the zones. */
export const COVERAGE_OPACITY = 0.1;
/** Blind area: hidden behind a blindspot and seen by no other camera. Same see-through fill, in red. */
export const COVERAGE_BLIND = '#dc2626';

export const isCamera = (o: EditorObject) => {
  const key = deviceKey(o);
  return key === 'cctv' || key === CAMERA_360_ICON;
};

export const isCamera360 = (o: EditorObject) => deviceKey(o) === CAMERA_360_ICON;

export {BLINDSPOT_ICON, CAMERA_360_ICON, COVERAGE_AREA_ICON};

/** Outline colour of coverage areas (dashed). */
export const COVERAGE_AREA_COLOR = '#16a34a';

/** Outline width of a new coverage area, unscaled canvas units. */
export const AREA_STROKE_WIDTH = 1.5;

/** Coverage area: a closed outline drawn with the area tool (a 'path' object, last point = first). */
export const isCoverageArea = (o: EditorObject) => o.type === 'path' && o.content === COVERAGE_AREA_ICON && !!o.pathData;

/** Coverage areas that are checked: visible layer, not being removed. */
export const coverageAreas = (objects: EditorObject[], visibleLayerIds?: Set<string>) =>
  objects.filter(o => isCoverageArea(o) && o.change !== 'REMOVE' && (!visibleLayerIds || visibleLayerIds.has(o.layerId)));
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

/** Field of view a camera of this type has when nothing is set: regular or 360°. */
export const cameraDefaults = (o: EditorObject) => isCamera360(o)
  ? { rangeFt: CAMERA_360_RANGE_FT, angleDeg: CAMERA_360_ANGLE_DEG }
  : { rangeFt: DEFAULT_CAMERA_RANGE_FT, angleDeg: DEFAULT_CAMERA_ANGLE_DEG };

export const cameraSpec = (o: EditorObject) => {
  const defaults = cameraDefaults(o);
  return {
    rangeFt: o.camera?.rangeFt || defaults.rangeFt,
    angleDeg: o.camera?.angleDeg || defaults.angleDeg,
  };
};

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

export const insidePolygon = (p: Point, poly: Point[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};

/** Distance along the ray from `o` in direction (dx, dy) to the nearest obstacle edge (Infinity = none). */
export const rayHit = (o: Point, dx: number, dy: number, segments: [Point, Point][]) => {
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

export type CoverageZones = {
  near: Point[];
  far: Point[] | null;
  /** Parts of the view hidden behind blindspots (from the obstacle out to the range), one polygon each. */
  hidden: Point[][];
  /** Everything the camera sees (near + far), as one outline. */
  seen: Point[];
};

/**
 * The two zones as closed polygons: near sector (0–15 ft) and the far band (15 ft – range), both
 * cut off behind blindspot obstacles, plus what the obstacles hide. An obstacle the camera sits inside is ignored.
 */
export const coverageZones = (c: Coverage, obstacles: Obstacle[] = []): CoverageZones => {
  const full = c.half * 2 >= Math.PI * 2;
  const blocking = obstacles.filter(o => !o.closed || !insidePolygon(c.center, o.pts));
  const segments = obstacleSegments(blocking);
  if (blocking.length === 0) {
    const nearArc = arcPoints(c, c.nearR);
    return {
      near: full ? nearArc : [c.center, ...nearArc],
      far: c.farR > c.nearR ? [...arcPoints(c, c.farR), ...nearArc.slice().reverse()] : null,
      hidden: [],
      seen: full ? arcPoints(c, c.farR).slice(0, -1) : [c.center, ...arcPoints(c, c.farR)],
    };
  }
  const rays = rayAngles(c, blocking, 64).map(a => {
    const dx = Math.cos(a), dy = Math.sin(a);
    const hit = rayHit(c.center, dx, dy, segments);
    const at = (r: number) => ({ x: c.center.x + dx * r, y: c.center.y + dy * r });
    return { near: at(Math.min(c.nearR, hit)), far: at(Math.min(c.farR, hit)), edge: at(c.farR), blocked: hit < c.farR };
  });
  const nearArc = rays.map(r => r.near);
  return {
    near: full ? nearArc : [c.center, ...nearArc],
    far: c.farR > c.nearR ? [...rays.map(r => r.far), ...nearArc.slice().reverse()] : null,
    hidden: blockedRuns(rays, full).map(run => [...run.map(r => r.edge), ...run.map(r => r.far).reverse()]),
    seen: full ? rays.map(r => r.far) : [c.center, ...rays.map(r => r.far)],
  };
};

/** Runs of consecutive blocked rays; on a full circle a run across the start joins its end. */
const blockedRuns = <R extends { blocked: boolean }>(rays: R[], full: boolean): R[][] => {
  let seq = rays;
  if (full) {
    const open = rays.findIndex(r => !r.blocked);
    if (open < 0) return [rays];
    seq = [...rays.slice(open), ...rays.slice(0, open)];
  }
  const runs: R[][] = [];
  let run: R[] = [];
  for (const r of seq) {
    if (r.blocked) run.push(r);
    else if (run.length) { runs.push(run); run = []; }
  }
  if (run.length) runs.push(run);
  return runs.filter(r => r.length > 1);
};

/** Ring for polygon-clipping: coordinates rounded (its sweep line dislikes near-equal points), repeats dropped. */
const toRing = (pts: Point[]): Polygon | null => {
  const ring: [number, number][] = [];
  for (const p of pts) {
    const q: [number, number] = [Math.round(p.x * 1e4) / 1e4, Math.round(p.y * 1e4) / 1e4];
    const last = ring[ring.length - 1];
    if (!last || last[0] !== q[0] || last[1] !== q[1]) ring.push(q);
  }
  if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring.pop();
  return ring.length >= 3 ? [ring] : null;
};

/** Slivers thinner than this (canvas units) are leftovers of the ray sampling, not real blind areas. */
const MIN_BLIND_THICKNESS = 0.75;

/** Rough thickness of a ring: area / perimeter. */
const ringThickness = (ring: [number, number][]) => {
  let area = 0, perimeter = 0;
  ring.forEach(([x1, y1], i) => {
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
    perimeter += Math.hypot(x2 - x1, y2 - y1);
  });
  return perimeter ? Math.abs(area) / perimeter : 0;
};

const toRings = (polys: Point[][]) => polys.map(toRing).filter((r): r is Polygon => !!r);

/** `ring` minus all of `cut`; a geometry hiccup drops only this one. */
const subtract = (ring: Polygon | null, cut: Polygon[]): Polygon[] => {
  if (!ring) return [];
  try {
    return cut.length ? polygonClipping.difference(ring, ...cut) : [ring];
  } catch {
    return [];
  }
};

/** Polygons, each as rings (outline first, then holes). */
export type ZoneShape = Point[][][];

/** A camera's zones as shown: limited to its coverage areas (see `limitToAreas`). */
export type ShownZones = { id: string; near: ZoneShape; far: ZoneShape; seen: ZoneShape; hidden: Point[][] };

const toPolygon = (rings: Point[][]): Polygon | null => {
  const out = rings.map(r => toRing(r)?.[0]);
  return out[0] ? out.filter((r): r is [number, number][] => !!r) : null;
};
const toPolygons = (shape: ZoneShape) => shape.map(toPolygon).filter((p): p is Polygon => !!p);
const fromPolygons = (polys: Polygon[]): ZoneShape => polys.map(p => p.map(r => r.map(([x, y]) => ({ x, y }))));

/**
 * A camera assigned to coverage areas sees only inside them: its zones stop at the areas' edges.
 * A camera no area picks (areas with no cameras picked take every camera) is left as it is.
 */
export const limitToAreas = (id: string, zones: CoverageZones, areas: EditorObject[]): ShownZones => {
  const shown: ShownZones = {
    id, near: [[zones.near]], far: zones.far ? [[zones.far]] : [], seen: [[zones.seen]], hidden: zones.hidden,
  };
  const own = toRings(areas.filter(a => a.coverageCameraIds?.includes(id)).map(a => pathPoints(a.pathData!)));
  if (!own.length) return shown;
  try {
    const inside = own.length > 1 ? polygonClipping.union(own[0], ...own.slice(1)) : own;
    const clip = (shape: ZoneShape) => fromPolygons(toPolygons(shape).flatMap(p => polygonClipping.intersection(p, inside)));
    return { id, near: clip(shown.near), far: clip(shown.far), seen: clip(shown.seen), hidden: [] };
  } catch {
    return shown;
  }
};

/**
 * Blind areas, red on the plan. Each result is a polygon as rings (outline first, then holes).
 * - With coverage areas: the parts of each area its cameras (all, when none are picked) do not see.
 * - Without: what a blindspot hides from one camera and no other camera sees.
 * Blindspot boxes themselves never count (a shelf is not floor to watch).
 */
export const blindAreas = (
  zones: Pick<ShownZones, 'id' | 'seen' | 'hidden'>[], obstacles: Obstacle[] = [], areas: EditorObject[] = [],
): Point[][][] => {
  const boxes = toRings(obstacles.filter(o => o.closed).map(o => o.pts));
  let pieces: Polygon[] = [];
  if (areas.length) {
    for (const area of areas) {
      const ids = area.coverageCameraIds?.length ? new Set(area.coverageCameraIds) : null;
      const seen = zones.filter(z => !ids || ids.has(z.id)).flatMap(z => toPolygons(z.seen));
      pieces.push(...subtract(toRing(pathPoints(area.pathData!)), [...seen, ...boxes]));
    }
  } else {
    const covered = [...zones.flatMap(z => toPolygons(z.seen)), ...boxes];
    for (const part of zones.flatMap(z => z.hidden)) pieces.push(...subtract(toRing(part), covered));
  }
  if (pieces.length > 1) {
    // Shadows / areas may overlap: merge them so no spot is painted twice (darker).
    try { pieces = polygonClipping.union(pieces[0], ...pieces.slice(1)); } catch { /* keep them separate */ }
  }
  return pieces
    .filter(poly => ringThickness(poly[0] as [number, number][]) >= MIN_BLIND_THICKNESS)
    .map(poly => poly.map(r => r.map(([x, y]) => ({ x, y }))));
};

/** Cameras whose coverage is drawn: visible layer, not being removed. */
export const coverageCameras = (objects: EditorObject[], visibleLayerIds?: Set<string>) =>
  objects.filter(o => isCamera(o) && o.change !== 'REMOVE' && (!visibleLayerIds || visibleLayerIds.has(o.layerId)));
