import React from 'react';
import type {Point} from '@/core/measure';
import {AREA_STROKE_WIDTH, BLINDSPOT_COLOR, COVERAGE_AREA_COLOR, WALL_STROKE_WIDTH} from '@/core/camera-coverage';

/**
 * Blindspot wall being drawn: placed runs solid, the next run to the cursor dashed, corner points marked.
 * A coverage area (`closed`) also shows its tinted inside and the run that will close it back to the first point.
 */
export const WallPreview = ({ points, hover, scale, closed = false }: { points: Point[]; hover: Point | null; scale: number; closed?: boolean }) => {
  if (points.length === 0) return null;
  const last = points[points.length - 1];
  const color = closed ? COVERAGE_AREA_COLOR : BLINDSPOT_COLOR;
  const width = (closed ? AREA_STROKE_WIDTH : WALL_STROKE_WIDTH) * scale;
  const toPts = (pts: Point[]) => pts.map(p => `${p.x * scale},${p.y * scale}`).join(' ');
  const end = hover ?? last;
  return (
    <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ width: '100%', height: '100%', zIndex: 46 }} data-testid="wall-preview">
      {closed && <polygon points={toPts([...points, end])} fill={color} fillOpacity={0.08} stroke="none" />}
      <polyline points={toPts(points)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      {hover && (
        <line x1={last.x * scale} y1={last.y * scale} x2={hover.x * scale} y2={hover.y * scale}
          stroke={color} strokeWidth={width} strokeOpacity={0.5} strokeDasharray="6 4" strokeLinecap="round" />
      )}
      {closed && points.length >= 2 && (
        <line x1={end.x * scale} y1={end.y * scale} x2={points[0].x * scale} y2={points[0].y * scale}
          stroke={color} strokeWidth={width} strokeOpacity={0.35} strokeDasharray="6 4" strokeLinecap="round" />
      )}
      {[...points, ...(hover ? [hover] : [])].map((p, i) => (
        <circle key={i} cx={p.x * scale} cy={p.y * scale} r={4} fill="white" stroke={color} strokeWidth={2} />
      ))}
    </svg>
  );
};
