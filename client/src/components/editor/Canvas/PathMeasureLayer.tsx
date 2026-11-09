import React from 'react';
import {X} from 'lucide-react';
import {formatFeetInches, Point, segmentLength} from '@/core/measure';

export const PATH_MEASURE_COLOR = '#7c3aed';

/** Length of a run of points, in feet (null without a scale). */
export const polylineFeet = (points: Point[], ftPerUnit: number | null) => {
  if (!ftPerUnit) return null;
  let units = 0;
  for (let i = 1; i < points.length; i++) units += segmentLength(points[i - 1], points[i]);
  return units * ftPerUnit;
};

/**
 * The path measure on the plan: its segments with their lengths, the joints, and the total at
 * the last point (with ✕ to remove it). `hover`: the next segment, following the mouse.
 */
export const PathMeasureLayer = ({ points, hover, scale, ftPerUnit, onRemove }: {
  points: Point[]; hover: Point | null; scale: number; ftPerUnit: number | null; onRemove: () => void;
}) => {
  if (points.length === 0) return null;
  const all = hover ? [...points, hover] : points;
  const last = all[all.length - 1];
  const s = (p: Point) => `${p.x * scale},${p.y * scale}`;
  const total = polylineFeet(all, ftPerUnit);
  const segments = all.slice(1).map((b, i) => ({ a: all[i], b, preview: !!hover && i === all.length - 2 }));

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 36 }} data-testid="path-measure">
      <svg className="absolute inset-0 overflow-visible" style={{ width: '100%', height: '100%' }}>
        <polyline points={all.map(s).join(' ')} fill="none" stroke="white" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
        <polyline points={points.map(s).join(' ')} fill="none" stroke={PATH_MEASURE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover && (
          <line x1={points[points.length - 1].x * scale} y1={points[points.length - 1].y * scale} x2={hover.x * scale} y2={hover.y * scale}
            stroke={PATH_MEASURE_COLOR} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={p.x * scale} cy={p.y * scale} r={i === 0 ? 4.5 : 3.5} fill={i === 0 ? PATH_MEASURE_COLOR : 'white'} stroke={PATH_MEASURE_COLOR} strokeWidth={2} />
        ))}
      </svg>
      {/* Segment lengths (only with a scale, and only for segments long enough on screen to hold one). */}
      {ftPerUnit && segments.map(({ a, b, preview }, i) => (
        segmentLength(a, b) * scale > 36 && (
          <div
            key={i}
            className="absolute whitespace-nowrap rounded bg-white/90 px-1 text-[10px] font-semibold shadow-sm border"
            style={{
              left: (a.x + b.x) / 2 * scale, top: (a.y + b.y) / 2 * scale, transform: 'translate(-50%, -50%)',
              color: PATH_MEASURE_COLOR, borderColor: PATH_MEASURE_COLOR, opacity: preview ? 0.75 : 1,
            }}
          >
            {formatFeetInches(segmentLength(a, b) * ftPerUnit)}
          </div>
        )
      ))}
      <div
        className="absolute flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-md"
        style={{ left: last.x * scale, top: last.y * scale, transform: 'translate(10px, calc(-100% - 6px))', backgroundColor: PATH_MEASURE_COLOR }}
        data-testid="path-measure-total"
      >
        {points.length < 2 && !hover
          ? 'Tap the next point'
          : total === null ? 'No scale set' : `Total ${formatFeetInches(total)}`}
        {segments.length > 1 && <span className="font-normal opacity-80">· {segments.length} segments</span>}
        <button
          type="button"
          className="pointer-events-auto -mr-1 rounded p-0.5 hover:bg-white/25"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove the path measure"
          data-testid="path-measure-remove"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
