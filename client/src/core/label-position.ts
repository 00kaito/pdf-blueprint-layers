import type {EditorObject} from '@/lib/types';

export type LabelPosition = NonNullable<EditorObject['labelPosition']>;

export const DEFAULT_LABEL_POSITION: LabelPosition = 'bottom';

export const LABEL_POSITIONS: { value: LabelPosition; title: string }[] = [
  { value: 'top', title: 'Label above' },
  { value: 'left', title: 'Label on the left' },
  { value: 'bottom', title: 'Label below (default)' },
  { value: 'right', title: 'Label on the right' },
];

/**
 * Where to draw a label in visual page coordinates (y grows downwards).
 * The label box spans `boxWidth` × 1.5·fontSize with the text baseline at `baselineY`
 * (box top = baseline − fontSize, box bottom = baseline + fontSize/2), centred on `centerX`.
 */
export const getLabelAnchor = (
  position: LabelPosition,
  obj: { cx: number; cy: number; width: number; height: number },
  boxWidth: number,
  fontSize: number,
  /** Manual label offset (label centre − object centre), already in the same units as `obj`. */
  offset?: { x: number; y: number },
) => {
  if (offset) {
    // Box centre sits fontSize/4 above the baseline.
    return { centerX: obj.cx + offset.x, baselineY: obj.cy + offset.y + fontSize / 4 };
  }
  const gap = fontSize * 0.2;
  switch (position) {
    case 'top':
      return { centerX: obj.cx, baselineY: obj.cy - obj.height / 2 - gap - fontSize / 2 };
    case 'left':
      return { centerX: obj.cx - obj.width / 2 - gap - boxWidth / 2, baselineY: obj.cy + fontSize / 4 };
    case 'right':
      return { centerX: obj.cx + obj.width / 2 + gap + boxWidth / 2, baselineY: obj.cy + fontSize / 4 };
    case 'bottom':
    default:
      // Kept identical to the original placement so existing exports don't move.
      return { centerX: obj.cx, baselineY: obj.cy + obj.height / 2 + fontSize * 0.9 };
  }
};

type Box = { cx: number; cy: number; w: number; h: number };

/** Point where the ray from the box centre towards (tx, ty) leaves the box. */
const boxEdgePoint = (b: Box, tx: number, ty: number) => {
  const dx = tx - b.cx, dy = ty - b.cy;
  if (dx === 0 && dy === 0) return { x: b.cx, y: b.cy };
  const t = Math.min(
    dx !== 0 ? (b.w / 2) / Math.abs(dx) : Infinity,
    dy !== 0 ? (b.h / 2) / Math.abs(dy) : Infinity,
  );
  return { x: b.cx + dx * t, y: b.cy + dy * t };
};

const overlaps = (a: Box, b: Box) =>
  Math.abs(a.cx - b.cx) * 2 < a.w + b.w && Math.abs(a.cy - b.cy) * 2 < a.h + b.h;

/**
 * Leader line joining an object to its detached label, edge to edge.
 * Returns null when the label touches/overlaps the object or the gap is shorter than `minLength`.
 */
export const getLeaderLine = (object: Box, label: Box, minLength: number) => {
  if (overlaps(object, label)) return null;
  const from = boxEdgePoint(object, label.cx, label.cy);
  const to = boxEdgePoint(label, object.cx, object.cy);
  if (Math.hypot(to.x - from.x, to.y - from.y) < minLength) return null;
  return { from, to };
};
