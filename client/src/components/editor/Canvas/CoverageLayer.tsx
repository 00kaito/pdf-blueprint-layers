import React, {memo, useMemo} from 'react';
import type {EditorObject, Layer} from '@/lib/types';
import type {Point} from '@/core/measure';
import {
  COVERAGE_FAR,
  COVERAGE_NEAR,
  COVERAGE_OPACITY,
  coverageCameras,
  coverageObstacles,
  coverageOf,
  coverageZones,
} from '@/core/camera-coverage';

const toPath = (pts: Point[], scale: number) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${(p.x * scale).toFixed(1)} ${(p.y * scale).toFixed(1)}`).join(' ') + ' Z';

/** CCTV fields of view under the devices: darker near zone, lighter far band, see-through. */
export const CoverageLayer = memo(({ objects, layers, scale, ftPerUnit, visible }: {
  objects: EditorObject[];
  layers: Layer[];
  scale: number;
  ftPerUnit: number | null;
  visible: boolean;
}) => {
  const zones = useMemo(() => {
    if (!visible || !ftPerUnit) return [];
    const shown = new Set(layers.filter(l => l.visible).map(l => l.id));
    const obstacles = coverageObstacles(objects, shown);
    return coverageCameras(objects, shown).flatMap(o => {
      const c = coverageOf(o, ftPerUnit);
      return c ? [{ id: o.id, ...coverageZones(c, obstacles) }] : [];
    });
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
          {z.far && (
            <path d={toPath(z.far, scale)} fill={COVERAGE_FAR} fillOpacity={COVERAGE_OPACITY}
              stroke={COVERAGE_FAR} strokeOpacity={0.6} strokeWidth={1} data-zone="far" />
          )}
          <path d={toPath(z.near, scale)} fill={COVERAGE_NEAR} fillOpacity={COVERAGE_OPACITY}
            stroke={COVERAGE_NEAR} strokeOpacity={0.6} strokeWidth={1} data-zone="near" />
        </g>
      ))}
    </svg>
  );
});
