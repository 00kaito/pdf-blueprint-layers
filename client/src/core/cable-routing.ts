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

type Edge = [number, number];
/** Route network under construction: junction points and the straight segments between them. */
type Net = { nodes: Point[]; edges: Edge[] };
type Graph = Net & { adj: { to: number; w: number }[][] };

const distToSegment = (p: Point, a: Point, b: Point) => {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (len2 === 0) return segmentLength(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2));
  return segmentLength(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
};

/**
 * Point of segment a–b a cable from `p` reaches first when it runs sideways + straight: an end, or
 * the point level with `p` (a straight drop onto the segment).
 */
const closestOnSegment = (p: Point, a: Point, b: Point): { pt: Point; d: number } => {
  const cands: Point[] = [a, b];
  if (b.x !== a.x) {
    const t = (p.x - a.x) / (b.x - a.x);
    if (t > 0 && t < 1) cands.push({ x: p.x, y: a.y + t * (b.y - a.y) });
  }
  if (b.y !== a.y) {
    const t = (p.y - a.y) / (b.y - a.y);
    if (t > 0 && t < 1) cands.push({ x: a.x + t * (b.x - a.x), y: p.y });
  }
  return cands.map(pt => ({ pt, d: manhattan(p, pt) })).reduce((m, c) => (c.d < m.d ? c : m));
};

/** Where segments a–b and c–d cross away from their ends, if they do. */
const crossing = (a: Point, b: Point, c: Point, d: Point): Point | null => {
  const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
  const e = 1e-6;
  return t > e && t < 1 - e && u > e && u < 1 - e ? { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) } : null;
};

const nodeAt = (net: Net, p: Point, tol = ROUTE_JOIN_TOLERANCE) => {
  const i = net.nodes.findIndex(n => segmentLength(n, p) <= tol);
  if (i >= 0) return i;
  net.nodes.push({ x: p.x, y: p.y });
  return net.nodes.length - 1;
};

/** Splits edge `ei` at `p` (a point on it) and returns the node there. */
const splitEdgeAt = (net: Net, ei: number, p: Point) => {
  const i = nodeAt(net, p);
  const [a, b] = net.edges[ei];
  if (i !== a && i !== b) net.edges.splice(ei, 1, [a, i], [i, b]);
  return i;
};

/**
 * Route network: shared points join routes, a route ending on another route's segment branches
 * off it, and routes crossing each other are joined where they cross.
 */
const buildNet = (routes: CableRoute[], tol = ROUTE_JOIN_TOLERANCE): Net => {
  const net: Net = { nodes: [], edges: [] };
  for (const r of routes) {
    const ids = r.points.map(p => nodeAt(net, p, tol));
    for (let i = 1; i < ids.length; i++) if (ids[i] !== ids[i - 1]) net.edges.push([ids[i - 1], ids[i]]);
  }
  const { nodes, edges } = net;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const x = crossing(nodes[edges[i][0]], nodes[edges[i][1]], nodes[edges[j][0]], nodes[edges[j][1]]);
      if (x) nodeAt(net, x, tol);
    }
  }
  // Split every segment at the points lying on it (T-junctions and crossings).
  for (let n = 0; n < nodes.length; n++) {
    const next: Edge[] = [];
    for (const [a, b] of net.edges) {
      if (a !== n && b !== n && distToSegment(nodes[n], nodes[a], nodes[b]) <= tol) next.push([a, n], [n, b]);
      else next.push([a, b]);
    }
    net.edges = next;
  }
  return net;
};

/** Nodes connected to `start` along the routes. */
const reachable = (net: Net, start: number) => {
  const seen = new Set([start]);
  for (let grew = true; grew;) {
    grew = false;
    for (const [a, b] of net.edges) {
      if (seen.has(a) !== seen.has(b)) { seen.add(a); seen.add(b); grew = true; }
    }
  }
  return seen;
};

/**
 * Routes of one IDF that do not touch are still one network: each separate piece is joined to the
 * rest by the shortest sideways + straight hop, nearest piece first, so a cable can change routes.
 */
const bridgePieces = (net: Net, start: number) => {
  for (;;) {
    const inNet = reachable(net, start);
    const all = net.edges.map((_, i) => i);
    const outside = all.filter(i => !inNet.has(net.edges[i][0]));
    if (outside.length === 0) return;
    const inside = all.filter(i => inNet.has(net.edges[i][0]));
    const outNodes = new Set(outside.flatMap(i => net.edges[i]));
    let best: { from: number; ei: number; pt: Point; d: number } | null = null;
    const consider = (from: number, ei: number) => {
      const [a, b] = net.edges[ei];
      const c = closestOnSegment(net.nodes[from], net.nodes[a], net.nodes[b]);
      if (!best || c.d < best.d) best = { from, ei, ...c };
    };
    inNet.forEach(n => outside.forEach(ei => consider(n, ei)));
    outNodes.forEach(n => inside.forEach(ei => consider(n, ei)));
    const { from, ei, pt } = best!;
    const to = splitEdgeAt(net, ei, pt);
    if (to === from) continue;
    const f = net.nodes[from], t = net.nodes[to];
    if (Math.abs(f.x - t.x) > 1e-6 && Math.abs(f.y - t.y) > 1e-6) {
      net.nodes.push(elbow(f, t));
      const corner = net.nodes.length - 1;
      net.edges.push([from, corner], [corner, to]);
    } else {
      net.edges.push([from, to]);
    }
  }
};

const toGraph = (net: Net): Graph => {
  const adj: Graph['adj'] = net.nodes.map(() => []);
  for (const [a, b] of net.edges) {
    const w = segmentLength(net.nodes[a], net.nodes[b]);
    adj[a].push({ to: b, w });
    adj[b].push({ to: a, w });
  }
  return { ...net, adj };
};

/** Nearest point on the network for a cable from `p` (sideways + straight), and its segment. */
const nearestOnNet = (net: Net, p: Point, allowed: (ei: number) => boolean = () => true) => {
  let best: { pt: Point; d: number; ei: number } | null = null;
  net.edges.forEach(([a, b], ei) => {
    if (!allowed(ei)) return;
    const c = closestOnSegment(p, net.nodes[a], net.nodes[b]);
    if (!best || c.d < best.d - 1e-6) best = { ...c, ei };
  });
  return best as { pt: Point; d: number; ei: number } | null;
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
    const net = buildNet(routesForRack(routes, rack.id, rackIds));
    const entry = nearestOnNet(net, centerOf(rack));
    if (!entry) return { rack, g: toGraph(net), entryD: Infinity, tree: null };
    // The rack joins its nearest route where a straight run meets it, not only at a control point.
    const start = splitEdgeAt(net, entry.ei, entry.pt);
    bridgePieces(net, start);
    const g = toGraph(net);
    return { rack, g, entryD: entry.d, tree: dijkstra(g, start) };
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
  const { dist, prev } = reach.tree;

  // The cable drops onto the nearest route (anywhere along a segment), then follows the network.
  const hit = nearestOnNet(g, from, ei => isFinite(dist[g.edges[ei][0]]));
  if (!hit) return direct;
  // A device nearer to the rack than to any route goes straight in.
  if (manhattan(from, to) <= hit.d) return { ...direct, routed: true };
  const [a, b] = g.edges[hit.ei];
  const viaA = dist[a] + segmentLength(hit.pt, g.nodes[a]);
  const viaB = dist[b] + segmentLength(hit.pt, g.nodes[b]);
  const node = viaA <= viaB ? a : b;

  const nodePath: Point[] = [hit.pt];
  for (let n = node; n >= 0; n = prev[n]) nodePath.push(g.nodes[n]);
  const last = nodePath[nodePath.length - 1];
  return {
    rackId: reach.rack.id,
    units: hit.d + Math.min(viaA, viaB) + reach.entryD,
    path: dedupe([from, elbow(from, hit.pt), ...nodePath, elbow(last, to), to]),
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
