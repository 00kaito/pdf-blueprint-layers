import React from 'react';
import {X} from 'lucide-react';
import {CableRoute} from '@/lib/types';
import {Point} from '@/core/measure';
import {routeColor, SHARED_ROUTE_COLOR} from '@/core/cable-routing';
import {cn} from '@/lib/utils';

export type RackOption = { id: string; label: string; color: string };

interface RouteLayerProps {
  routes: CableRoute[];
  scale: number;
  /** Rack id → IDF colour. */
  colors: Map<string, string>;
  racks: RackOption[];
  /** Routes are shown (always while drawing them). */
  visible: boolean;
  /** Clicking a route selects it (select tool only). */
  selectable: boolean;
  selectedRouteId: string | null;
  onSelectRoute: (id: string | null) => void;
  onDeleteRoute: (id: string) => void;
  onSetRouteRack: (id: string, rackId: string | undefined) => void;
  /** Route being drawn, plus where the next point would go, in its IDF's colour. */
  drawing: Point[];
  hover: Point | null;
  drawingColor: string;
  /** Cable run of the selected device, with its length label. */
  run: { path: Point[]; label: string; estimated: boolean; color: string } | null;
}

const toPoints = (pts: Point[], scale: number) => pts.map(p => `${p.x * scale},${p.y * scale}`).join(' ');

/** Cable routes in their IDF's colour (control points joined by straight runs) and the selected device's run. */
export const RouteLayer = ({
  routes, scale, colors, racks, visible, selectable, selectedRouteId, onSelectRoute, onDeleteRoute, onSetRouteRack,
  drawing, hover, drawingColor, run,
}: RouteLayerProps) => {
  const preview = hover && drawing.length > 0 ? [...drawing, hover] : drawing;
  const selected = routes.find(r => r.id === selectedRouteId);
  const runEnd = run?.path[Math.floor(run.path.length / 2)];

  return (
    <>
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" style={{ zIndex: 15 }} data-no-marquee>
        {visible && routes.map(r => {
          const color = routeColor(r, colors);
          return (
            <g key={r.id}>
              {selectable && (
                // Wide invisible stroke: easy to hit.
                <polyline
                  points={toPoints(r.points, scale)}
                  fill="none" stroke="transparent" strokeWidth={14}
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onSelectRoute(r.id); }}
                  data-testid="cable-route"
                />
              )}
              <polyline
                points={toPoints(r.points, scale)}
                fill="none" stroke={color} strokeWidth={r.id === selectedRouteId ? 4 : 2.5}
                strokeLinejoin="round" strokeOpacity={0.85}
                strokeDasharray={r.rackId ? undefined : '10 4'}
              />
              {r.points.map((p, i) => (
                <rect key={i} x={p.x * scale - 3} y={p.y * scale - 3} width={6} height={6} fill="white" stroke={color} strokeWidth={1.5} />
              ))}
            </g>
          );
        })}

        {preview.length > 0 && (
          <g>
            <polyline points={toPoints(preview, scale)} fill="none" stroke={drawingColor} strokeWidth={2.5} strokeDasharray="6 4" />
            {preview.map((p, i) => (
              <rect key={i} x={p.x * scale - 3.5} y={p.y * scale - 3.5} width={7} height={7}
                fill={i === preview.length - 1 && hover ? drawingColor : 'white'} stroke={drawingColor} strokeWidth={1.5} />
            ))}
          </g>
        )}

        {run && run.path.length > 1 && (
          <>
            {/* White casing so the run stands out on top of a route of the same colour. */}
            <polyline points={toPoints(run.path, scale)} fill="none" stroke="white" strokeWidth={4} strokeLinejoin="round" strokeOpacity={0.9} />
            <polyline
              points={toPoints(run.path, scale)}
              fill="none" stroke={run.color} strokeWidth={2} strokeDasharray={run.estimated ? '2 4' : '6 3'}
              strokeLinejoin="round" data-testid="cable-run"
            />
          </>
        )}
      </svg>

      {run && runEnd && (
        <div
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-full -mt-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white shadow whitespace-nowrap"
          style={{ left: runEnd.x * scale, top: runEnd.y * scale, zIndex: 46, backgroundColor: run.color }}
        >
          {run.label}
        </div>
      )}

      {visible && selected && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full flex items-center gap-1 rounded-full bg-background border border-border shadow px-1 py-0.5"
          style={{ left: selected.points[0].x * scale, top: selected.points[0].y * scale - 8, zIndex: 46 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          data-no-marquee
        >
          {[...racks, { id: '', label: 'Shared', color: SHARED_ROUTE_COLOR }].map(r => {
            const active = (selected.rackId ?? '') === r.id;
            return (
              <button
                key={r.id || 'shared'}
                type="button"
                className={cn("h-5 rounded-full px-1.5 text-[10px] font-semibold border whitespace-nowrap", active ? "text-white" : "bg-background")}
                style={active ? { backgroundColor: r.color, borderColor: r.color } : { color: r.color, borderColor: r.color }}
                onClick={() => onSetRouteRack(selected.id, r.id || undefined)}
                title={r.id ? `Route of ${r.label}` : 'Shared by all IDFs'}
                data-testid={`route-rack-${r.id || 'shared'}`}
              >
                {r.label}
              </button>
            );
          })}
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            onClick={() => onDeleteRoute(selected.id)}
            title="Delete cable route (Del)"
            data-testid="delete-route"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </>
  );
};
