import type {EditorObject, Layer} from '@/lib/types';

export type Rect = { x: number; y: number; width: number; height: number };

/** Rectangle spanned by two corner points, in either drag direction. */
export const rectFromPoints = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(b.x - a.x),
  height: Math.abs(b.y - a.y),
});

const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const contains = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x && inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;

/** Points of a stored path ("M x y L x y …"). */
const pathPoints = (pathData: string) => {
  const n = (pathData.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) points.push({ x: n[i], y: n[i + 1] });
  return points;
};

/**
 * Objects picked by a selection rectangle (unscaled canvas units), in document order. Only visible,
 * unlocked layers. Regular objects are picked when the rectangle touches them; a drawn stroke when
 * any of its points is inside; a paint-bucket fill only when it is entirely inside — fills cover
 * large areas and would otherwise join almost every selection.
 */
export const objectsInRect = (objects: EditorObject[], layers: Layer[], rect: Rect): string[] => {
  const usable = new Set(layers.filter(l => l.visible && !l.locked).map(l => l.id));
  return objects
    .filter(o => {
      if (!usable.has(o.layerId)) return false;
      if (o.type === 'path') {
        return !!o.pathData && pathPoints(o.pathData).some(p =>
          p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height);
      }
      const box = { x: o.x, y: o.y, width: o.width, height: o.height };
      return o.isFill ? contains(rect, box) : intersects(rect, box);
    })
    .map(o => o.id);
};
