import type {EditorObject} from '@/lib/types';
import {deviceKey} from './lv-icons';
import type {Point} from './measure';

/** What a CCTV camera sees: a sector in front of it (walls are not taken into account). */
export const DEFAULT_CAMERA_RANGE_FT = 25;
export const DEFAULT_CAMERA_ANGLE_DEG = 100;
/** Up to here the picture is sharp (darker zone); beyond it, up to the range, lighter. */
export const CAMERA_NEAR_FT = 15;
export const COVERAGE_NEAR = '#0369a1';
export const COVERAGE_FAR = '#38bdf8';
/** Fill opacity: the plan stays readable under the zones. */
export const COVERAGE_OPACITY = 0.1;

export const isCamera = (o: EditorObject) => deviceKey(o) === 'cctv';

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

/** The two zones as closed polygons: near sector (0–15 ft) and the far band (15 ft – range). */
export const coverageZones = (c: Coverage): { near: Point[]; far: Point[] | null } => {
  const nearArc = arcPoints(c, c.nearR);
  return {
    near: c.half * 2 >= Math.PI * 2 ? nearArc : [c.center, ...nearArc],
    far: c.farR > c.nearR ? [...arcPoints(c, c.farR), ...nearArc.slice().reverse()] : null,
  };
};

/** Cameras whose coverage is drawn: visible layer, not being removed. */
export const coverageCameras = (objects: EditorObject[], visibleLayerIds?: Set<string>) =>
  objects.filter(o => isCamera(o) && o.change !== 'REMOVE' && (!visibleLayerIds || visibleLayerIds.has(o.layerId)));
