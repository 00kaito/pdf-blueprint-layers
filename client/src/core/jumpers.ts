import type {EditorObject, Jumper, JumperCable, JumperType, LvSettings, MeasureCalibration} from '@/lib/types';
import {feetPerUnit, Point, segmentLength} from './measure';
import {gatedStatus, isJumperPulled, normalizeJumper} from '@shared/jumpers';
export {gatedStatus, isJumperPulled} from '@shared/jumpers';

/**
 * Jumpers (cables between two objects, see @shared/jumpers): their types, geometry on the plan and
 * lengths. Drawn as dashed arcs so they never look like the straight IDF home-runs.
 */

export const JUMPER_TYPES: { id: JumperType; label: string; color: string }[] = [
  { id: 'HDMI', label: 'HDMI', color: '#0891b2' },
  { id: 'USB_C', label: 'USB-C', color: '#c026d3' },
  { id: 'CAT6', label: 'Cat6', color: '#ea580c' },
  { id: 'SPEAKER', label: 'Speaker', color: '#65a30d' },
  { id: 'COAX', label: 'Coax', color: '#a16207' },
  { id: 'FIBER', label: 'Fiber', color: '#0d9488' },
  { id: 'OTHER', label: 'Other', color: '#64748b' },
];

export const jumperTypeOf = (id: JumperType) => JUMPER_TYPES.find(t => t.id === id) ?? JUMPER_TYPES[JUMPER_TYPES.length - 1];

/** Colour of a jumper carrying several types of cable. */
export const BUNDLE_COLOR = '#334155';

/** One type: its colour; a bundle of types: one neutral colour (the label names them). */
export const jumperColor = (j: Jumper) =>
  new Set(j.cables.map(c => c.type)).size === 1 ? jumperTypeOf(j.cables[0].type).color : BUNDLE_COLOR;

/** The jumper carries at least one of `types` (empty = any). */
export const jumperHasType = (j: Jumper, types: JumperType[]) => !types.length || j.cables.some(c => types.includes(c.type));

/** "Cat6 + 2× HDMI + USB-C". */
export const formatJumperCables = (cables: JumperCable[]) =>
  cables.map(c => `${c.count > 1 ? `${c.count}× ` : ''}${jumperTypeOf(c.type).label}`).join(' + ');

/** Cables with `type` added (1×) or removed; the last one is never removed. */
export const toggleJumperCable = (cables: JumperCable[], type: JumperType): JumperCable[] =>
  cables.some(c => c.type === type)
    ? (cables.length > 1 ? cables.filter(c => c.type !== type) : cables)
    : [...cables, { type, count: 1 }].sort((a, b) => typeOrder(a.type) - typeOrder(b.type));

/** Cables with the count of `type` changed by `delta` (1–99; down from 1 removes it unless it is the last). */
export const stepJumperCable = (cables: JumperCable[], type: JumperType, delta: number): JumperCable[] => {
  const c = cables.find(x => x.type === type);
  if (!c) return delta > 0 ? toggleJumperCable(cables, type) : cables;
  const count = c.count + delta;
  if (count < 1) return toggleJumperCable(cables, type);
  return cables.map(x => (x.type === type ? { ...x, count: Math.min(99, count) } : x));
};

const typeOrder = (t: JumperType) => JUMPER_TYPES.findIndex(x => x.id === t);

/** Cables in all, of every type: 3. */
export const jumperCableCount = (j: Jumper) => j.cables.reduce((n, c) => n + c.count, 0);

export type JumperLink = { jumper: Jumper; from: EditorObject; to: EditorObject };

/** Objects a jumper can start / end at: placed icons and images (not fills, drawings, text or coverage areas). */
export const canHaveJumpers = (o: EditorObject) => (o.type === 'icon' || o.type === 'image') && !o.isFill;

export const centerOf = (o: EditorObject): Point => ({ x: o.x + o.width / 2, y: o.y + o.height / 2 });

/** Every jumper whose two ends are on the plan (in the current shape, see normalizeJumper). */
export const allJumpers = (objects: EditorObject[]): JumperLink[] => {
  const byId = new Map(objects.map(o => [o.id, o]));
  const out: JumperLink[] = [];
  for (const from of objects) {
    for (const jumper of from.jumpers ?? []) {
      const to = byId.get(jumper.toId);
      if (to) out.push({ jumper: normalizeJumper(jumper), from, to });
    }
  }
  return out;
};

/** Jumpers with `id` at either end. */
export const jumpersOf = (links: JumperLink[], id: string) => links.filter(l => l.from.id === id || l.to.id === id);

/** Objects with a jumper at either end that is not pulled yet. */
export const objectsWaitingForJumpers = (links: JumperLink[]): Set<string> => {
  const ids = new Set<string>();
  for (const { from, to, jumper } of links) {
    if (isJumperPulled(jumper)) continue;
    ids.add(from.id);
    ids.add(to.id);
  }
  return ids;
};

/**
 * The objects with the status they are shown with (see gatedStatus), for progress counts and the cable
 * summary. Same array when no object is held back.
 */
export const withShownStatuses = (objects: EditorObject[]): EditorObject[] => {
  const waiting = objectsWaitingForJumpers(allJumpers(objects));
  if (!waiting.size) return objects;
  let changed = false;
  const next = objects.map(o => {
    const status = gatedStatus(o.status, waiting.has(o.id));
    if (status === o.status) return o;
    changed = true;
    return { ...o, status };
  });
  return changed ? next : objects;
};

/** Jumper cables (every type, every jumper) and jumper lines at each object (either end), by object id. */
export const jumperCounts = (links: JumperLink[]): Map<string, { cables: number; jumpers: number }> => {
  const counts = new Map<string, { cables: number; jumpers: number }>();
  const add = (id: string, cables: number) => {
    const c = counts.get(id) ?? { cables: 0, jumpers: 0 };
    counts.set(id, { cables: c.cables + cables, jumpers: c.jumpers + 1 });
  };
  for (const { from, to, jumper } of links) {
    const cables = jumperCableCount(jumper);
    add(from.id, cables);
    add(to.id, cables);
  }
  return counts;
};

export type JumperGeometry = {
  /** SVG path in unscaled canvas units (scale it with a transform or `scalePath`). */
  points: Point[];
  /** Quadratic control point when it is a plain arc. */
  control: Point | null;
  /** Where the label goes (middle of the line). */
  mid: Point;
};

/**
 * The line of a jumper: a gentle arc between the two centres (bent to one side, so two jumpers
 * between the same objects can be told apart by `bend`), or a polyline through its waypoints.
 */
export const jumperGeometry = (from: EditorObject, to: EditorObject, points: Point[] | undefined, bend = 0): JumperGeometry => {
  const a = centerOf(from), b = centerOf(to);
  if (points?.length) {
    const all = [a, ...points, b];
    return { points: all, control: null, mid: pointAlong(all, 0.5) };
  }
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // Bend 18% of the distance off the straight line, more for each further jumper on the same pair.
  const off = len * (0.18 + 0.1 * bend);
  const control = { x: (a.x + b.x) / 2 - (dy / len) * off, y: (a.y + b.y) / 2 + (dx / len) * off };
  return {
    points: [a, b],
    control,
    mid: { x: (a.x + 2 * control.x + b.x) / 4, y: (a.y + 2 * control.y + b.y) / 4 },
  };
};

/** SVG `d` of a jumper at `scale`. */
export const jumperPathD = (g: JumperGeometry, scale: number) => {
  const s = (p: Point) => `${p.x * scale},${p.y * scale}`;
  return g.control
    ? `M${s(g.points[0])} Q${s(g.control)} ${s(g.points[1])}`
    : `M${g.points.map(s).join(' L')}`;
};

/** The point `t` (0–1) of the way along a polyline. */
const pointAlong = (pts: Point[], t: number): Point => {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += segmentLength(pts[i - 1], pts[i]);
  let left = total * t;
  for (let i = 1; i < pts.length; i++) {
    const seg = segmentLength(pts[i - 1], pts[i]);
    if (left <= seg && seg > 0) {
      const k = left / seg;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
    }
    left -= seg;
  }
  return pts[pts.length - 1];
};

/**
 * Length of one cable of a jumper (ft): the one entered by hand, or the distance on the plan (through
 * its waypoints; a straight line without them) plus the device slack at both ends. Null without a scale.
 */
export const jumperFeet = (link: JumperLink, calibration: MeasureCalibration | null, s: LvSettings): number | null => {
  if (link.jumper.lengthFt) return link.jumper.lengthFt;
  const fpu = feetPerUnit(calibration);
  if (fpu === null) return null;
  const pts = [centerOf(link.from), ...(link.jumper.points ?? []), centerOf(link.to)];
  let units = 0;
  for (let i = 1; i < pts.length; i++) units += segmentLength(pts[i - 1], pts[i]);
  return units * fpu + 2 * s.deviceSlackFt;
};

/** Whole feet, rounded up (cables are cut long): `14'`. */
export const formatJumperFeet = (ft: number | null) => (ft === null ? '' : `${Math.ceil(ft)}'`);

/** Objects without the jumpers that end at one of `deletedIds` (the objects themselves are left in). */
export const withoutJumpersTo = (objects: EditorObject[], deletedIds: Set<string>): EditorObject[] => {
  let changed = false;
  const next = objects.map(o => {
    if (!o.jumpers?.some(j => deletedIds.has(j.toId))) return o;
    changed = true;
    const jumpers = o.jumpers.filter(j => !deletedIds.has(j.toId));
    if (jumpers.length) return { ...o, jumpers };
    const { jumpers: _, ...rest } = o;
    return rest;
  });
  return changed ? next : objects;
};

/**
 * Copies of jumpers for pasted / imported objects: `idMap` old id → new id. Jumpers whose other end
 * is not among them are dropped; the copies get new ids, start over as planned and their waypoints move by `shift`.
 */
export const remapJumpers = (jumpers: Jumper[] | undefined, idMap: Map<string, string>, newId: () => string, shift: Point = { x: 0, y: 0 }): Jumper[] | undefined => {
  const kept = (jumpers ?? []).filter(j => idMap.has(j.toId)).map(normalizeJumper);
  if (!kept.length) return undefined;
  return kept.map(({ status, statusUpdatedAt, statusUpdatedBy, issueDescription, ...j }) => ({
    ...j, id: newId(), toId: idMap.get(j.toId)!, points: j.points?.map(p => ({ x: p.x + shift.x, y: p.y + shift.y })),
  }));
};

/** What runs along a jumper: "Cat6 + 2× HDMI + USB-C". */
export const jumperTitle = (j: Jumper) => formatJumperCables(j.cables);
