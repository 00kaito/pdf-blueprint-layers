import React, {memo, useMemo} from 'react';
import type {EditorObject, Layer} from '@/lib/types';
import type {Point} from '@/core/measure';
import {
  blindAreas,
  COVERAGE_BLIND,
  COVERAGE_FAR,
  COVERAGE_NEAR,
  COVERAGE_OPACITY,
  coverageAreas,
  coverageCameras,
  coverageObstacles,
  coverageOf,
  coverageZones,
  limitToAreas,
  type ZoneShape,
} from '@/core/camera-coverage';

const toPath = (pts: Point[], scale: number) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${(p.x * scale).toFixed(1)} ${(p.y * scale).toFixed(1)}`).join(' ') + ' Z';

/** Every ring of every polygon in one path (drawn with evenodd, so holes stay open). */
const shapePath = (shape: ZoneShape, scale: number) => shape.flat().map(r => toPath(r, scale)).join(' ');

/** CCTV fields of view under the devices: darker near zone, lighter far band, see-through. */
export const CoverageLayer = memo(({ objects, layers, scale, ftPerUnit, visible }: {
  objects: EditorObject[];
  layers: Layer[];
  scale: number;
  ftPerUnit: number | null;
  visible: boolean;
}) => {
  const { zones, blind } = useMemo(() => {
    if (!visible || !ftPerUnit) return { zones: [], blind: [] };
    const shown = new Set(layers.filter(l => l.visible).map(l => l.id));
    const obstacles = coverageObstacles(objects, shown);
    const areas = coverageAreas(objects, shown);
    const zones = coverageCameras(objects, shown).flatMap(o => {
      const c = coverageOf(o, ftPerUnit);
      return c ? [limitToAreas(o.id, coverageZones(c, obstacles), areas)] : [];
    });
    return { zones, blind: blindAreas(zones, obstacles, areas) };
  }, [objects, layers, ftPerUnit, visible]);

  if (zones.length === 0) return null;
  return (
    <svg
      className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
      style={{ zIndex: 14 }}
      data-testid="camera-coverage"
    >
      {zones.map(z => (
        <g key={z.id} data-camera-id={z.id}>
          {z.far.length > 0 && (
            <path d={shapePath(z.far, scale)} fillRule="evenodd" fill={COVERAGE_FAR} fillOpacity={COVERAGE_OPACITY}
              stroke={COVERAGE_FAR} strokeOpacity={0.6} strokeWidth={1} data-zone="far" />
          )}
          {z.near.length > 0 && (
            <path d={shapePath(z.near, scale)} fillRule="evenodd" fill={COVERAGE_NEAR} fillOpacity={COVERAGE_OPACITY}
              stroke={COVERAGE_NEAR} strokeOpacity={0.6} strokeWidth={1} data-zone="near" />
          )}
        </g>
      ))}
      {/* Red: hidden behind a blindspot and seen by no camera at all. */}
      {blind.map((rings, i) => (
        <path key={i} d={rings.map(r => toPath(r, scale)).join(' ')} fillRule="evenodd"
          fill={COVERAGE_BLIND} fillOpacity={COVERAGE_OPACITY}
          stroke={COVERAGE_BLIND} strokeOpacity={0.6} strokeWidth={1} data-zone="blind" />
      ))}
    </svg>
  );
});
