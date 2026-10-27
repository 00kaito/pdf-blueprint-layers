import type {EditorObject} from '@/lib/types';
import {
  CAMERA_360_ANGLE_DEG, CAMERA_360_ICON, CAMERA_360_RANGE_FT, cameraDefaults, DEFAULT_CAMERA_ANGLE_DEG, DEFAULT_CAMERA_RANGE_FT,
  insidePolygon, obstacleSegments, rayHit, type Obstacle,
} from './camera-coverage';
import {DEFAULT_ICON_COLOR} from './constants';
import type {Point} from './measure';

/**
 * Automatic camera placement: as few cameras as possible covering as much of the coverage areas as
 * possible (maximum coverage, solved greedily, then pruned).
 * The areas are sampled on a grid; every possible camera (mount point × type × direction) is the
 * set of samples it sees; cameras are picked by new samples per cost until the target is met.
 * Regular cameras go on the area edges / corners and along drawn walls, 360° cameras in the middle
 * (on the centre line of a rectangle).
 */

export type CameraType = {
  id: string;
  name: string;
  rangeFt: number;
  angleDeg: number;
  /** Relative price: a camera covering twice as much at cost 2 is as good as one at cost 1. */
  cost: number;
  /** Most cameras of this type (null = no limit). */
  max: number | null;
  enabled: boolean;
};

export type PlacementInput = {
  /** Coverage area outlines (no repeated closing point). */
  areas: Point[][];
  obstacles: Obstacle[];
  ftPerUnit: number;
  types: CameraType[];
  /** Stop once this share (0–100) of the reachable floor is covered. */
  targetPct: number;
};

export type PlacedCamera = {
  /** Camera centre, plan units. */
  x: number;
  y: number;
  /** View direction as an icon rotation (0 = lens to the right, clockwise). */
  rotationDeg: number;
  typeId: string;
  /** Areas (indexes into `areas`) the camera covers a real part of. */
  areaIdx: number[];
};

export type PlacementResult = {
  cameras: PlacedCamera[];
  /** Share of the areas covered (0–100). */
  coveredPct: number;
  /** Share no allowed mount point can see at all (0–100). */
  unreachablePct: number;
  sampleCount: number;
};

export const is360Type = (t: Pick<CameraType, 'angleDeg'>) => t.angleDeg >= 360;

/** Upper bound of samples; the grid gets coarser for big areas. */
const MAX_SAMPLES = 20000;
/** Mount points along edges / walls, ft apart. */
const EDGE_STEP_FT = 3;
/** Mount points sit this far inside the area (ft), so they are not on the outline itself. */
const INSET_FT = 0.5;
/** Mount points along a rectangle's centre line, ft apart. */
const CENTRE_STEP_FT = 2;
/** View directions tried, this far apart (radians), up to 90° either side of straight inwards. */
const DIR_STEP = Math.PI / 12;
/** Rays per mount point for line of sight. */
const RAYS = 720;
/** A camera counts for an area once it covers this many of its samples (or 5% of a small one). */
const MIN_AREA_SAMPLES = 10;

type Mount = { p: Point; inward: number; centre: boolean };
type Candidate = { mount: number; type: number; dir: number; cells: number[]; cost: number };

const TAU = Math.PI * 2;
const norm = (a: number) => ((a % TAU) + TAU) % TAU;
const angleDiff = (a: number, b: number) => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, TAU - d); };

const polygonArea = (pts: Point[]) => {
  let s = 0;
  pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; s += p.x * q.y - q.x * p.y; });
  return Math.abs(s) / 2;
};

/** Points of an area without a repeated closing point. */
const openRing = (pts: Point[]) => {
  const last = pts[pts.length - 1];
  return pts.length > 1 && last.x === pts[0].x && last.y === pts[0].y ? pts.slice(0, -1) : pts;
};

/** The two short sides' midpoints of a rectangle (4 corners, right angles ± 3°), or null. */
const rectangleCentreLine = (pts: Point[]): [Point, Point] | null => {
  if (pts.length !== 4) return null;
  for (let i = 0; i < 4; i++) {
    const a = pts[(i + 3) % 4], b = pts[i], c = pts[(i + 1) % 4];
    const ux = a.x - b.x, uy = a.y - b.y, vx = c.x - b.x, vy = c.y - b.y;
    const cos = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
    if (!(Math.abs(cos) < 0.0524)) return null;
  }
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const len = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
  // Sides 0–1 / 2–3 longer: the centre line joins the midpoints of 1–2 and 3–0.
  return len(pts[0], pts[1]) >= len(pts[1], pts[2])
    ? [mid(pts[1], pts[2]), mid(pts[3], pts[0])]
    : [mid(pts[0], pts[1]), mid(pts[2], pts[3])];
};

export const placeCameras = (input: PlacementInput, onProgress?: (share: number) => void): PlacementResult => {
  const { ftPerUnit, obstacles } = input;
  const ft = (v: number) => v / ftPerUnit;
  // Kept in input order (result indexes refer to it); a degenerate outline simply contains nothing.
  const areas = input.areas.map(openRing);
  const types = input.types.filter(t => t.enabled && t.rangeFt > 0 && t.angleDeg > 0);
  const empty: PlacementResult = { cameras: [], coveredPct: 0, unreachablePct: 100, sampleCount: 0 };
  if (!areas.some(a => a.length >= 3) || !types.length || !(ftPerUnit > 0)) return empty;

  const boxes = obstacles.filter(o => o.closed).map(o => o.pts);
  const inBox = (p: Point) => boxes.some(b => insidePolygon(p, b));
  const areaOf = (p: Point) => areas.findIndex(a => insidePolygon(p, a));

  // 1. Samples on a grid, indexed by cell for lookups around a point.
  const xs = areas.flat().map(p => p.x), ys = areas.flat().map(p => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
  const total = areas.reduce((s, a) => s + polygonArea(a), 0);
  let step = Math.max(ft(1), Math.sqrt(total / MAX_SAMPLES));
  // Areas far apart: keep the grid index itself bounded.
  step = Math.max(step, Math.sqrt(((maxX - minX) * (maxY - minY)) / 4e6));
  const cols = Math.max(1, Math.ceil((maxX - minX) / step)), rows = Math.max(1, Math.ceil((maxY - minY) / step));
  const grid = new Int32Array(cols * rows).fill(-1);
  const sx: number[] = [], sy: number[] = [], sArea: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = { x: minX + (c + 0.5) * step, y: minY + (r + 0.5) * step };
      const a = areaOf(p);
      if (a < 0 || inBox(p)) continue;
      grid[r * cols + c] = sx.length;
      sx.push(p.x); sy.push(p.y); sArea.push(a);
    }
  }
  const n = sx.length;
  if (!n) return empty;
  const areaSamples = areas.map((_, i) => sArea.filter(a => a === i).length);
  onProgress?.(0.05);

  // 2. Mount points.
  const anyRegular = types.some(t => !is360Type(t)), any360 = types.some(is360Type);
  const mounts: Mount[] = [];
  const addMount = (p: Point, inward: number, centre: boolean) => {
    if (areaOf(p) >= 0 && !inBox(p)) mounts.push({ p, inward, centre });
  };
  const inset = ft(INSET_FT);
  if (anyRegular) {
    for (const area of areas) {
      // Inward normal of each edge, found by probing (works for any winding and concave shapes).
      const normals = area.map((a, i) => {
        const b = area[(i + 1) % area.length];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
        const mid = { x: (a.x + b.x) / 2 + nx * inset, y: (a.y + b.y) / 2 + ny * inset };
        return insidePolygon(mid, area) ? { x: nx, y: ny } : { x: -nx, y: -ny };
      });
      area.forEach((a, i) => {
        const b = area[(i + 1) % area.length], nrm = normals[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const count = Math.max(1, Math.round(len / ft(EDGE_STEP_FT)));
        for (let k = 0; k < count; k++) {
          const t = (k + 0.5) / count;
          addMount({ x: a.x + (b.x - a.x) * t + nrm.x * inset, y: a.y + (b.y - a.y) * t + nrm.y * inset }, Math.atan2(nrm.y, nrm.x), false);
        }
        // Corner: along the bisector of the two edges' inward normals.
        const prev = normals[(i + area.length - 1) % area.length];
        const bx = prev.x + nrm.x, by = prev.y + nrm.y, bl = Math.hypot(bx, by);
        if (bl > 1e-6) addMount({ x: a.x + (bx / bl) * inset * Math.SQRT2, y: a.y + (by / bl) * inset * Math.SQRT2 }, Math.atan2(by, bx), false);
      });
    }
    // Both faces of drawn walls.
    for (const [a, b] of obstacleSegments(obstacles.filter(o => !o.closed))) {
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (!len) continue;
      const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
      const count = Math.max(1, Math.round(len / ft(EDGE_STEP_FT)));
      for (let k = 0; k < count; k++) {
        const t = (k + 0.5) / count, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        addMount({ x: x + nx * inset, y: y + ny * inset }, Math.atan2(ny, nx), false);
        addMount({ x: x - nx * inset, y: y - ny * inset }, Math.atan2(-ny, -nx), false);
      }
    }
  }
  if (any360) {
    const range360 = Math.max(...types.filter(is360Type).map(t => t.rangeFt));
    for (const area of areas) {
      const line = rectangleCentreLine(area);
      if (line) {
        const [a, b] = line, len = Math.hypot(b.x - a.x, b.y - a.y);
        const count = Math.max(1, Math.round(len / ft(CENTRE_STEP_FT)));
        // From just inside one short side to just inside the other.
        const t0 = Math.min(0.5, inset / (len || 1));
        for (let k = 0; k <= count; k++) {
          const t = t0 + ((1 - 2 * t0) * k) / count;
          addMount({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, 0, true);
        }
        continue;
      }
      // Any other shape: a grid inside it, plus its centre.
      const g = ft(Math.max(CENTRE_STEP_FT, range360 / 4));
      const axs = area.map(p => p.x), ays = area.map(p => p.y);
      for (let y = Math.min(...ays) + g / 2; y < Math.max(...ays); y += g) {
        for (let x = Math.min(...axs) + g / 2; x < Math.max(...axs); x += g) {
          if (insidePolygon({ x, y }, area)) addMount({ x, y }, 0, true);
        }
      }
      const c = area.reduce((s, p) => ({ x: s.x + p.x / area.length, y: s.y + p.y / area.length }), { x: 0, y: 0 });
      if (insidePolygon(c, area)) addMount(c, 0, true);
    }
  }
  onProgress?.(0.1);

  // 3–4. What each mount point sees, and the candidates (mount × type × direction) it gives.
  const allSegments = obstacles.map(o => ({ o, segs: obstacleSegments([o]) }));
  const candidates: Candidate[] = [];
  const typeRange = types.map(t => ft(t.rangeFt));
  mounts.forEach((m, mi) => {
    const usable = types.map((t, i) => (is360Type(t) === m.centre ? i : -1)).filter(i => i >= 0);
    if (!usable.length) return;
    const maxR = Math.max(...usable.map(i => typeRange[i]));
    // Obstacles near enough to matter; one the camera stands inside does not block it (as on screen).
    const segs = allSegments
      .filter(({ o }) => !o.closed || !insidePolygon(m.p, o.pts))
      .flatMap(({ segs }) => segs)
      .filter(([a, b]) => Math.max(a.x, b.x) >= m.p.x - maxR && Math.min(a.x, b.x) <= m.p.x + maxR
        && Math.max(a.y, b.y) >= m.p.y - maxR && Math.min(a.y, b.y) <= m.p.y + maxR);
    const reach = new Float64Array(RAYS);
    for (let k = 0; k < RAYS; k++) {
      const a = (k * TAU) / RAYS;
      reach[k] = segs.length ? Math.min(maxR, rayHit(m.p, Math.cos(a), Math.sin(a), segs)) : maxR;
    }
    const vis: number[] = [], visD: number[] = [], visA: number[] = [];
    const c0 = Math.max(0, Math.floor((m.p.x - maxR - minX) / step)), c1 = Math.min(cols - 1, Math.floor((m.p.x + maxR - minX) / step));
    const r0 = Math.max(0, Math.floor((m.p.y - maxR - minY) / step)), r1 = Math.min(rows - 1, Math.floor((m.p.y + maxR - minY) / step));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const s = grid[r * cols + c];
        if (s < 0) continue;
        const dx = sx[s] - m.p.x, dy = sy[s] - m.p.y, d = Math.hypot(dx, dy);
        if (d > maxR) continue;
        const a = norm(Math.atan2(dy, dx));
        if (d > reach[Math.round((a / TAU) * RAYS) % RAYS]) continue;
        vis.push(s); visD.push(d); visA.push(a);
      }
    }
    if (!vis.length) return;
    for (const ti of usable) {
      const t = types[ti], half = (Math.min(t.angleDeg, 360) * Math.PI) / 360, range = typeRange[ti];
      const dirs = is360Type(t) ? [0] : Array.from({ length: 13 }, (_, k) => m.inward + (k - 6) * DIR_STEP);
      for (const dir of dirs) {
        const cells: number[] = [];
        for (let k = 0; k < vis.length; k++) {
          if (visD[k] <= range && (is360Type(t) || angleDiff(visA[k], dir) <= half + 1e-9)) cells.push(vis[k]);
        }
        if (cells.length) candidates.push({ mount: mi, type: ti, dir: norm(dir), cells, cost: Math.max(t.cost, 0.01) });
      }
    }
    if (mi % 50 === 0) onProgress?.(0.1 + 0.6 * (mi / mounts.length));
  });

  const reachable = new Uint8Array(n);
  for (const c of candidates) for (const s of c.cells) reachable[s] = 1;
  const reachableCount = reachable.reduce((s, v) => s + v, 0);
  const target = Math.ceil((Math.min(100, Math.max(1, input.targetPct)) / 100) * reachableCount);

  // 5. Lazy greedy: a candidate's gain only shrinks as others are picked, so a stale gain is an
  // upper bound — only the top of the queue is re-evaluated.
  const count = new Uint16Array(n);
  let covered = 0;
  const used = types.map(() => 0);
  // One camera per mount point (two lenses on one spot is not a placement).
  const mountUsed = new Uint8Array(mounts.length);
  const chosen: number[] = [];
  const gainOf = (ci: number) => { let g = 0; for (const s of candidates[ci].cells) if (!count[s]) g++; return g; };
  const take = (ci: number) => { for (const s of candidates[ci].cells) if (!count[s]++) covered++; used[candidates[ci].type]++; mountUsed[candidates[ci].mount] = 1; chosen.push(ci); };
  const drop = (ci: number) => {
    for (const s of candidates[ci].cells) if (!--count[s]) covered--;
    used[candidates[ci].type]--;
    mountUsed[candidates[ci].mount] = 0;
    chosen.splice(chosen.indexOf(ci), 1);
  };
  const full = (ti: number) => types[ti].max != null && used[ti] >= types[ti].max!;
  const blocked = (c: Candidate) => full(c.type) || mountUsed[c.mount] === 1;

  const heap: { score: number; ci: number; round: number }[] = [];
  const push = (item: typeof heap[number]) => {
    heap.push(item);
    for (let i = heap.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (heap[p].score >= heap[i].score) break;
      [heap[p], heap[i]] = [heap[i], heap[p]]; i = p;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l].score > heap[m].score) m = l;
        if (r < heap.length && heap[r].score > heap[m].score) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
      }
    }
    return top;
  };
  candidates.forEach((c, ci) => push({ score: c.cells.length / c.cost, ci, round: 0 }));
  let round = 0;
  while (covered < target && heap.length) {
    const top = pop();
    const c = candidates[top.ci];
    if (blocked(c)) continue;
    if (top.round === round) { take(top.ci); round++; continue; }
    const g = gainOf(top.ci);
    if (g > 0) push({ score: g / c.cost, ci: top.ci, round });
  }
  onProgress?.(0.85);

  // 6. Prune: drop cameras the target does without (smallest own share first, dearer first) …
  const unique = (ci: number) => { let u = 0; for (const s of candidates[ci].cells) if (count[s] === 1) u++; return u; };
  const prune = () => {
    for (let changed = true; changed;) {
      changed = false;
      const order = [...chosen].sort((a, b) => unique(a) - unique(b) || candidates[b].cost - candidates[a].cost);
      for (const ci of order) {
        if (covered - unique(ci) >= target) { drop(ci); changed = true; break; }
      }
    }
  };
  prune();
  // … then try to swap each for a cheaper one (or one covering more at the same price) given the rest.
  for (const ci of [...chosen]) {
    drop(ci);
    const own = gainOf(ci), need = Math.min(covered + own, target), taken = new Set(chosen);
    let best = ci, bestGain = own;
    candidates.forEach((c, k) => {
      if (k === ci || taken.has(k) || blocked(c) || c.cost > candidates[best].cost) return;
      const g = gainOf(k);
      if (covered + g >= need && (c.cost < candidates[best].cost || g > bestGain)) { best = k; bestGain = g; }
    });
    take(best);
  }
  prune();
  onProgress?.(1);

  // 7. Result.
  const cameras = chosen.map(ci => {
    const c = candidates[ci], m = mounts[c.mount];
    const perArea = areas.map(() => 0);
    for (const s of c.cells) perArea[sArea[s]]++;
    return {
      x: m.p.x, y: m.p.y,
      rotationDeg: is360Type(types[c.type]) ? 0 : Math.round(((c.dir * 180) / Math.PI) * 10) / 10 % 360,
      typeId: types[c.type].id,
      areaIdx: perArea.flatMap((k, a) => (k >= Math.min(MIN_AREA_SAMPLES, Math.ceil(areaSamples[a] * 0.05)) && k > 0 ? [a] : [])),
    };
  });
  return {
    cameras,
    coveredPct: (covered / n) * 100,
    unreachablePct: ((n - reachableCount) / n) * 100,
    sampleCount: n,
  };
};

/** Starting camera types: a regular camera and a 360° one, with their defaults. */
export const DEFAULT_CAMERA_TYPES: CameraType[] = [
  { id: 'standard', name: 'Standard', rangeFt: DEFAULT_CAMERA_RANGE_FT, angleDeg: DEFAULT_CAMERA_ANGLE_DEG, cost: 1, max: null, enabled: true },
  { id: '360', name: '360°', rangeFt: CAMERA_360_RANGE_FT, angleDeg: CAMERA_360_ANGLE_DEG, cost: 1, max: null, enabled: true },
];

/** Icon of a placed camera: the 360° one for a type that sees all around. */
export const cameraIconOf = (t: Pick<CameraType, 'angleDeg'>) => (is360Type(t) ? CAMERA_360_ICON : 'cctv');

/**
 * A proposal as plan objects: one camera icon centred on each point (field of view stored only
 * where it differs from the icon's defaults), and the cameras each area gets.
 */
export const placementObjects = (
  result: PlacementResult, types: CameraType[], areaIds: string[],
  opts: { layerId: string; size: (content: string) => number; cables: (content: string) => EditorObject['cables']; newId: (i: number) => string },
): { cameras: EditorObject[]; areaCameras: Record<string, string[]> } => {
  const areaCameras: Record<string, string[]> = Object.fromEntries(areaIds.map(id => [id, []]));
  const cameras = result.cameras.flatMap((c, i) => {
    const t = types.find(t => t.id === c.typeId);
    if (!t) return [];
    const content = cameraIconOf(t), size = opts.size(content), id = opts.newId(i);
    const defaults = cameraDefaults({ type: 'icon', content } as EditorObject);
    const camera = {
      rangeFt: t.rangeFt !== defaults.rangeFt ? t.rangeFt : undefined,
      angleDeg: t.angleDeg !== defaults.angleDeg ? t.angleDeg : undefined,
    };
    for (const a of c.areaIdx) if (areaIds[a]) areaCameras[areaIds[a]].push(id);
    const object: EditorObject = {
      id, type: 'icon', name: '', content, color: DEFAULT_ICON_COLOR, status: 'PLANNED',
      x: c.x - size / 2, y: c.y - size / 2, width: size, height: size, rotation: c.rotationDeg,
      layerId: opts.layerId, cables: opts.cables(content),
      camera: camera.rangeFt === undefined && camera.angleDeg === undefined ? undefined : camera,
    };
    return [object];
  });
  return { cameras, areaCameras };
};
