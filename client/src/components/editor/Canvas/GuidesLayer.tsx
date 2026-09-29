import React from 'react';
import {useDragState} from '@/lib/drag-store';
import {projectOnTape} from '@/core/snapping';
import {formatFeetInches} from '@/core/measure';
import {UIState} from '@/lib/types';
import {MEASURE_COLOR} from './MeasureLayer';

const GUIDE_COLOR = '#d946ef';

interface GuidesLayerProps {
  scale: number;
  tape: UIState['measureTape'];
  /** Feet per unscaled canvas unit, or null without a measuring scale. */
  ftPerUnit: number | null;
}

/**
 * While an object is dragged: alignment guides to the objects it snapped to, and — when a measuring
 * tape is on the blueprint — where the object's centre falls along the tape, counted from the tape's
 * start in the direction it was pulled out.
 */
export const GuidesLayer = ({ scale, tape, ftPerUnit }: GuidesLayerProps) => {
  const drag = useDragState();
  if (!drag) return null;

  const { box, guides } = drag;
  const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const proj = tape ? projectOnTape(c, tape.a, tape.b) : null;

  let reading = '';
  if (proj) {
    const pct = `${Math.round(proj.t * 100)}%`;
    reading = ftPerUnit ? `${formatFeetInches(proj.along * ftPerUnit)} · ${pct}` : pct;
  }

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 36 }}>
      <svg className="absolute inset-0 overflow-visible" style={{ width: '100%', height: '100%' }}>
        {guides.map((g, i) => (
          <line
            key={i}
            x1={g.x1 * scale} y1={g.y1 * scale} x2={g.x2 * scale} y2={g.y2 * scale}
            stroke={GUIDE_COLOR} strokeWidth={1} strokeDasharray="4 3"
          />
        ))}
        {proj && tape && (
          <>
            {/* Beyond the ends of the tape, extend it faintly up to the reading. */}
            {(proj.t < 0 || proj.t > 1) && (
              <line
                x1={(proj.t < 0 ? tape.a.x : tape.b.x) * scale} y1={(proj.t < 0 ? tape.a.y : tape.b.y) * scale}
                x2={proj.foot.x * scale} y2={proj.foot.y * scale}
                stroke={MEASURE_COLOR} strokeWidth={1} strokeDasharray="2 3" opacity={0.7}
              />
            )}
            <line
              x1={c.x * scale} y1={c.y * scale} x2={proj.foot.x * scale} y2={proj.foot.y * scale}
              stroke={MEASURE_COLOR} strokeWidth={1} strokeDasharray="3 3" opacity={0.6}
            />
            <circle cx={proj.foot.x * scale} cy={proj.foot.y * scale} r={4.5} fill="white" stroke={MEASURE_COLOR} strokeWidth={2} />
          </>
        )}
      </svg>
      {proj && (
        <div
          className="absolute whitespace-nowrap rounded border border-red-600 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-red-600 shadow-md"
          style={{ left: proj.foot.x * scale, top: proj.foot.y * scale, transform: 'translate(-50%, 10px)' }}
          data-testid="tape-reading"
        >
          {reading}
        </div>
      )}
    </div>
  );
};
