import React from 'react';
import type {Point} from '@/core/measure';
import {BLINDSPOT_COLOR, WALL_STROKE_WIDTH} from '@/core/camera-coverage';

/** Blindspot wall being drawn: placed runs solid, the next run to the cursor dashed, corner points marked. */
export const WallPreview = ({ points, hover, scale }: { points: Point[]; hover: Point | null; scale: number }) => {
  if (points.length === 0) return null;
  const last = points[points.length - 1];
  const toPts = (pts: Point[]) => pts.map(p => `${p.x * scale},${p.y * scale}`).join(' ');
  return (
    <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ width: '100%', height: '100%', zIndex: 46 }} data-testid="wall-preview">
      <polyline points={toPts(points)} fill="none" stroke={BLINDSPOT_COLOR} strokeWidth={WALL_STROKE_WIDTH * scale} strokeLinecap="round" strokeLinejoin="round" />
      {hover && (
        <line x1={last.x * scale} y1={last.y * scale} x2={hover.x * scale} y2={hover.y * scale}
          stroke={BLINDSPOT_COLOR} strokeWidth={WALL_STROKE_WIDTH * scale} strokeOpacity={0.5} strokeDasharray="6 4" strokeLinecap="round" />
      )}
      {[...points, ...(hover ? [hover] : [])].map((p, i) => (
        <circle key={i} cx={p.x * scale} cy={p.y * scale} r={4} fill="white" stroke={BLINDSPOT_COLOR} strokeWidth={2} />
      ))}
    </svg>
  );
};
