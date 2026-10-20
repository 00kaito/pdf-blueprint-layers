import type {CableRoute, CableType, EditorObject, LvSettings, MeasureCalibration, PlanChange} from '@/lib/types';
import {CABLE_TYPES, RACK_ICON} from './lv-icons';
import {feetPerUnit, Point, segmentLength} from './measure';

/**
 * Cable lengths along drawn cable routes. Cables never run diagonally: from a device the cable goes
 * straight sideways until it lines up with the nearest route point, then straight to it, then along
 * the route (control point to control point) to the rack, and from the route into the rack the same
 * way. All distances are in unscaled canvas units until converted with the measuring scale.
 */

/** Route points closer than this (canvas units) are the same junction. */
export const ROUTE_JOIN_TOLERANCE = 2;

export const isRack = (o: EditorObject) => o.type === 'icon' && o.content === RACK_ICON && !o.isFill;

/** Objects that carry cables: placed devices (icons / images), not racks, text, drawings or fills. */
export const isCableDevice = (o: EditorObject) =>
  !o.isFill && (o.type === 'icon' || o.type === 'image') && !isRack(o);

/** True when at least one cable is assigned — devices without cables have no run to show. */
export const hasCables = (o: EditorObject) => (o.cables ?? []).some(c => c.count > 0);

/** IDF colours in rack order: IDF 1 red, IDF 2 blue, … — used for its routes, cable runs and devices. */
export const RACK_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#d97706', '#0891b2'];
/** Routes shared by all IDFs (or of a deleted rack). */
export const SHARED_ROUTE_COLOR = '#6b7280';

export const getRacks = (objects: EditorObject[]) => objects.filter(isRack);

export const rackLabel = (racks: EditorObject[], id: string) => {
  const i = racks.findIndex(r => r.id === id);
  return i < 0 ? '?' : racks[i].name || `IDF ${i + 1}`;
};

export const rackColorMap = (objects: EditorObject[]) =>
  new Map(getRacks(objects).map((r, i) => [r.id, RACK_COLORS[i % RACK_COLORS.length]]));

/** Colour of a route: its IDF's, or grey when it is shared / its rack is gone. */
export const routeColor = (route: CableRoute, colors: Map<string, string>) =>
  (route.rackId && colors.get(route.rackId)) || SHARED_ROUTE_COLOR;

/** Routes a rack's cables may use: its own and the shared ones. */
export const routesForRack = (routes: CableRoute[], rackId: string, rackIds: Set<string>) =>
  routes.filter(r => !r.rackId || r.rackId === rackId || !rackIds.has(r.rackId));

/** Rack the route tool draws for: the picked one, none for 'shared', else the first rack. */
export const effectiveRouteRack = (picked: string | 'shared' | null, racks: EditorObject[]): string | undefined => {
  if (picked === 'shared') return undefined;
  if (picked && racks.some(r => r.id === picked)) return picked;
  return racks[0]?.id;
};

export const centerOf =(o: { x: number; y: number; width: number; height: number }): Point =>
  ({ x: o.x + o.width / 2, y: o.y + o.height / 2 });

const manhattan = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Sideways first, then straight to the point — the corner of that L. */
const elbow = (from: Point, to: Point): Point => ({ x: to.x, y: from.y });

/** Drops repeated points (an elbow that falls on the point itself). */
const dedupe = (path: Point[]) =>
  path.filter((p, i) => i === 0 || Math.abs(p.x - path[i - 1].x) > 1e-6 || Math.abs(p.y - path[i - 1].y) > 1e-6);

type Graph = { nodes: Point[]; adj: { to: number; w: number }[][] };

const distToSegment = (p: Point, a: Point, b: Point) => {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (len2 === 0) return segmentLength(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2));
  return segmentLength(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
};

/** Route network: shared points join routes, and a route ending on another route's segment branches off it. */
export const buildRouteGraph = (routes: CableRoute[], tol = ROUTE_JOIN_TOLERANCE): Graph => {
  const nodes: Point[] = [];
  const nodeAt = (p: Point) => {
    const i = nodes.findIndex(n => segmentLength(n, p) <= tol);
    if (i >= 0) return i;
    nodes.push({ x: p.x, y: p.y });
    return nodes.length - 1;
  };
  let edges: [number, number][] = [];
  for (const r of routes) {
    const ids = r.points.map(nodeAt);
    for (let i = 1; i < ids.length; i++) if (ids[i] !== ids[i - 1]) edges.push([ids[i - 1], ids[i]]);
  }
  // T-junctions: split a segment where another route's point lies on it.
  for (let n = 0; n < nodes.length; n++) {
    const next: [number, number][] = [];
    for (const [a, b] of edges) {
      if (a !== n && b !== n && distToSegment(nodes[n], nodes[a], nodes[b]) <= tol) next.push([a, n], [n, b]);
      else next.push([a, b]);
    }
    edges = next;
  }
  const adj: Graph['adj'] = nodes.map(() => []);
  for (const [a, b] of edges) {
    const w = segmentLength(nodes[a], nodes[b]);
    adj[a].push({ to: b, w });
    adj[b].push({ to: a, w });
  }
  return { nodes, adj };
};

/** Shortest distances (and the previous node on that path) from `source` to every node. */
const dijkstra = (g: Graph, source: number) => {
  const dist = g.nodes.map(() => Infinity);
  const prev = g.nodes.map(() => -1);
  const done = g.nodes.map(() => false);
  dist[source] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < dist.length; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0) break;
    done[u] = true;
    for (const { to, w } of g.adj[u]) {
      if (dist[u] + w < dist[to]) { dist[to] = dist[u] + w; prev[to] = u; }
    }
  }
  return { dist, prev };
};

/** Indices of the nodes nearest to `p` (by sideways + straight distance); several when tied. */
const nearestNodes = (g: Graph, p: Point, allowed: (i: number) => boolean = () => true) => {
  let best = Infinity;
  let ids: number[] = [];
  g.nodes.forEach((n, i) => {
    if (!allowed(i)) return;
    const d = manhattan(p, n);
    if (d < best - 1e-6) { best = d; ids = [i]; } else if (Math.abs(d - best) <= 1e-6) ids.push(i);
  });
  return { ids, d: best };
};

export type CableRun = {
  rackId: string;
  /** Route length in canvas units (no slack). */
  units: number;
  /** Polyline the cable follows, device → rack, for the preview. */
  path: Point[];
  /** False when no cable route reaches the rack: estimated sideways + straight, device to rack. */
  routed: boolean;
};

/** A rack with its own route network (its routes + shared ones) and the shortest ways into it. */
type RackReach = { rack: EditorObject; g: Graph; entryD: number; tree: ReturnType<typeof dijkstra> | null };

const prepareRacks = (racks: EditorObject[], routes: CableRoute[]): RackReach[] => {
  const rackIds = new Set(racks.map(r => r.id));
  return racks.map(rack => {
    const g = buildRouteGraph(routesForRack(routes, rack.id, rackIds));
    if (g.nodes.length === 0) return { rack, g, entryD: Infinity, tree: null };
    const { ids, d } = nearestNodes(g, centerOf(rack));
    return { rack, g, entryD: d, tree: dijkstra(g, ids[0]) };
  });
};

const runTo = (device: EditorObject, reach: RackReach): CableRun => {
  const g = reach.g;
  const from = centerOf(device);
  const to = centerOf(reach.rack);
  const direct: CableRun = {
    rackId: reach.rack.id, units: manhattan(from, to), path: dedupe([from, elbow(from, to), to]), routed: false,
  };
  if (!reach.tree) return direct;

  // Nearest point among those connected to this rack (a route not joined to its network is skipped).
  const tree = reach.tree;
  const { ids, d } = nearestNodes(g, from, i => isFinite(tree.dist[i]));
  // A device nearer to the rack than to any route goes straight in.
  if (manhattan(from, to) <= d) return { ...direct, routed: true };
  // A tie is decided by the shorter way on to the rack.
  const node = ids.reduce((a, b) => (tree.dist[b] < tree.dist[a] ? b : a));
  const along = tree.dist[node];

  const nodePath: Point[] = [];
  for (let n = node; n >= 0; n = reach.tree.prev[n]) nodePath.push(g.nodes[n]);
  const first = nodePath[0], last = nodePath[nodePath.length - 1];
  return {
    rackId: reach.rack.id,
    units: d + along + reach.entryD,
    path: dedupe([from, elbow(from, first), ...nodePath, elbow(last, to), to]),
    routed: true,
  };
};

/**
 * Run of every cable device to its rack: the one picked in `metadata.rackId`, otherwise the rack with
 * the shortest run. A cable only follows its own IDF's routes (and shared ones). Devices are left out
 * when the plan has no rack.
 */
export const computeCableRuns = (objects: EditorObject[], routes: CableRoute[]): Map<string, CableRun> => {
  const racks = getRacks(objects);
  const runs = new Map<string, CableRun>();
  if (racks.length === 0) return runs;
  const reach = prepareRacks(racks, routes);
  for (const o of objects) {
    if (!isCableDevice(o)) continue;
    const chosen = reach.find(r => r.rack.id === o.metadata?.rackId);
    const run = chosen
      ? runTo(o, chosen)
      : reach.map(r => runTo(o, r)).reduce((a, b) => (b.units < a.units ? b : a));
    runs.set(o.id, run);
  }
  return runs;
};

/** Feet of one cable on this run, slack at both ends included; null without a measuring scale. */
export const runFeet = (run: CableRun, calibration: MeasureCalibration | null, s: LvSettings): number | null => {
  const fpu = feetPerUnit(calibration);
  return fpu === null ? null : run.units * fpu + s.deviceSlackFt + s.serviceLoopFt;
};

// --- Summary (bill of materials) ---

export type CableTotals = Record<CableType, { count: number; feet: number }>;

export type RackSummary = {
  rackId: string | null;
  name: string;
  devices: number;
  cables: CableTotals;
  patchPanels: number;
  /** Devices whose run is estimated (no cable route reaches them). */
  estimated: number;
};

export type ProgressBucket = 'planned' | 'pulled' | 'terminated' | 'tested' | 'issue';

export type CableSummary = {
  racks: RackSummary[];
  total: RackSummary;
  /** Cables (not devices) per type and install progress. */
  progress: Record<CableType, Record<ProgressBucket, number>>;
  /** Object ids per design change. */
  changes: Record<PlanChange, string[]>;
  /** Devices (not to be removed) with no cable assigned. */
  noCables: string[];
  /** Cables on points marked to be removed — not part of the totals. */
  removed: CableTotals;
  hasScale: boolean;
  runs: Map<string, CableRun>;
};

const emptyTotals = (): CableTotals =>
  Object.fromEntries(CABLE_TYPES.map(t => [t.id, { count: 0, feet: 0 }])) as CableTotals;

const emptyRack = (rackId: string | null, name: string): RackSummary =>
  ({ rackId, name, devices: 0, cables: emptyTotals(), patchPanels: 0, estimated: 0 });

const bucketOf = (status: EditorObject['status']): ProgressBucket => {
  switch (status) {
    case 'CABLE_PULLED': return 'pulled';
    case 'TERMINATED': return 'terminated';
    case 'TESTED':
    case 'APPROVED': return 'tested';
    case 'ISSUE': return 'issue';
    default: return 'planned';
  }
};

export const buildCableSummary = (
  objects: EditorObject[],
  routes: CableRoute[],
  calibration: MeasureCalibration | null,
  settings: LvSettings,
): CableSummary => {
  const fpu = feetPerUnit(calibration);
  const runs = computeCableRuns(objects, routes);
  const racks = getRacks(objects);
  const byRack = new Map<string | null, RackSummary>(
    racks.map(r => [r.id, emptyRack(r.id, rackLabel(racks, r.id))]),
  );
  const total = emptyRack(null, 'Project total');
  const removed = emptyTotals();
  const progress = Object.fromEntries(CABLE_TYPES.map(t => [
    t.id, { planned: 0, pulled: 0, terminated: 0, tested: 0, issue: 0 },
  ])) as CableSummary['progress'];
  const changes: CableSummary['changes'] = { RELOCATE: [], REMOVE: [], NEW: [], ON_HOLD: [] };
  const noCables: string[] = [];

  for (const o of objects) {
    if (o.change && !o.isFill) changes[o.change].push(o.id);
    if (!isCableDevice(o)) continue;
    const cables = o.cables ?? [];
    if (o.change === 'REMOVE') {
      for (const c of cables) removed[c.type].count += c.count;
      continue;
    }
    if (!hasCables(o)) noCables.push(o.id);
    const run = runs.get(o.id);
    let rack = byRack.get(run?.rackId ?? null);
    if (!rack) {
      rack = emptyRack(null, 'No rack');
      byRack.set(null, rack);
    }
    const feetEach = run && fpu !== null ? run.units * fpu + settings.deviceSlackFt + settings.serviceLoopFt : 0;
    for (const target of [rack, total]) {
      target.devices += 1;
      if (run && !run.routed) target.estimated += 1;
      for (const c of cables) {
        target.cables[c.type].count += c.count;
        target.cables[c.type].feet += feetEach * c.count;
      }
    }
    for (const c of cables) progress[c.type][bucketOf(o.status)] += c.count;
  }

  const list = Array.from(byRack.values());
  for (const r of [...list, total]) r.patchPanels = Math.ceil(r.cables.CAT6.count / settings.portsPerPanel);
  // The project needs every rack's panels — not one count over the summed ports.
  total.patchPanels = list.reduce((n, r) => n + r.patchPanels, 0);

  return { racks: list, total, progress, changes, noCables, removed, hasScale: fpu !== null, runs };
};
