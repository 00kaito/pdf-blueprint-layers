import type {Point} from './measure';

/** Axis-aligned box in unscaled canvas units. */
export type Box = { x: number; y: number; width: number; height: number };

/** Guide segment (unscaled canvas units) showing what an object snapped to. */
export type Guide = { x1: number; y1: number; x2: number; y2: number };

export type SnapResult = { x: number; y: number; guides: Guide[] };

/** Snap strength in screen px — divided by the zoom so it feels the same at every zoom level. */
export const SNAP_DISTANCE_PX = 8;

const center = (b: Box): Point => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

/** Anchor offsets from the box origin along one axis: start edge, centre, end edge. */
const anchors = (size: number) => [0, size / 2, size];

type AxisMatch = { delta: number; target: Box; line: number; distance: number };

/**
 * Best snap along one axis: the smallest shift that lines up any anchor (edge / centre) of the moving
 * box with any anchor of another box. Equal shifts go to the box nearest to the moving one.
 */
const bestAlong = (
  pos: number, size: number, others: Box[], axis: 'x' | 'y', threshold: number, moving: Box,
): AxisMatch | null => {
  let best: AxisMatch | null = null;
  const c = center(moving);
  for (const o of others) {
    const oPos = axis === 'x' ? o.x : o.y;
    const oSize = axis === 'x' ? o.width : o.height;
    const oc = center(o);
    const distance = Math.hypot(oc.x - c.x, oc.y - c.y);
    for (const a of anchors(size)) {
      for (const b of anchors(oSize)) {
        const delta = oPos + b - (pos + a);
        if (Math.abs(delta) > threshold) continue;
        const better = !best
          || Math.abs(delta) < Math.abs(best.delta) - 1e-6
          || (Math.abs(Math.abs(delta) - Math.abs(best.delta)) <= 1e-6 && distance < best.distance);
        if (better) best = { delta, target: o, line: oPos + b, distance };
      }
    }
  }
  return best;
};

/**
 * Snaps a moving box to the edges / centres of other boxes, independently on X and Y.
 * Returns the adjusted position and guide segments that connect the box with its snap targets.
 */
export const snapBox = (box: Box, others: Box[], threshold: number): SnapResult => {
  const mx = bestAlong(box.x, box.width, others, 'x', threshold, box);
  const my = bestAlong(box.y, box.height, others, 'y', threshold, box);
  const x = box.x + (mx?.delta ?? 0);
  const y = box.y + (my?.delta ?? 0);
  const snapped: Box = { ...box, x, y };
  const guides: Guide[] = [];

  // Vertical guide at the shared X, spanning both boxes.
  if (mx) {
    const top = Math.min(snapped.y, mx.target.y);
    const bottom = Math.max(snapped.y + snapped.height, mx.target.y + mx.target.height);
    guides.push({ x1: mx.line, y1: top, x2: mx.line, y2: bottom });
  }
  // Horizontal guide at the shared Y.
  if (my) {
    const left = Math.min(snapped.x, my.target.x);
    const right = Math.max(snapped.x + snapped.width, my.target.x + my.target.width);
    guides.push({ x1: left, y1: my.line, x2: right, y2: my.line });
  }
  return { x, y, guides };
};

/**
 * Projects a point onto the measuring tape's line (from `a`, in the direction it was pulled out).
 * `t` is the fraction of the tape (0 at `a`, 1 at `b`, outside [0, 1] beyond the ends); `along`
 * the signed distance from `a` and `offset` the perpendicular distance, both in canvas units.
 */
export const projectOnTape = (p: Point, a: Point, b: Point) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return null;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  const foot = { x: a.x + t * dx, y: a.y + t * dy };
  const len = Math.sqrt(len2);
  return { t, along: t * len, offset: Math.hypot(p.x - foot.x, p.y - foot.y), foot };
};

/**
 * Moves a point in fixed steps (Shift-drag). With a measuring tape the steps follow the tape: the
 * distance along it (from its start) and the distance across it are both whole multiples of `step`,
 * so the tape reading jumps 15' 0" → 15' 6" → … Without a tape the step grid starts at `origin`
 * (where the drag began) along the page axes.
 */
export const stepPoint = (p: Point, origin: Point, step: number, tape: { a: Point; b: Point } | null): Point => {
  const q = (v: number) => Math.round(v / step) * step;
  const len = tape ? Math.hypot(tape.b.x - tape.a.x, tape.b.y - tape.a.y) : 0;
  if (!tape || len === 0) {
    return { x: origin.x + q(p.x - origin.x), y: origin.y + q(p.y - origin.y) };
  }
  const ux = (tape.b.x - tape.a.x) / len, uy = (tape.b.y - tape.a.y) / len; // along the tape
  const nx = -uy, ny = ux;                                                   // across it
  const dx = p.x - tape.a.x, dy = p.y - tape.a.y;
  const along = q(dx * ux + dy * uy);
  const across = q(dx * nx + dy * ny);
  return { x: tape.a.x + along * ux + across * nx, y: tape.a.y + along * uy + across * ny };
};
