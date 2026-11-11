import React, {useMemo, useState} from 'react';
import {Trash2} from 'lucide-react';
import type {EditorObject, Jumper, JumperType} from '@/lib/types';
import type {Point} from '@/core/measure';
import {
  centerOf, formatJumperFeet, isJumperPulled, jumperColor, jumperHasType, JumperLink, jumperPathD, jumperTitle, layoutJumpers,
} from '@/core/jumpers';
import {JumperCablesPicker} from '../JumperCablesPicker';
import {statusOf} from '@/core/status';
import {objectTypeName} from '@/core/lv-icons';
import {cn} from '@/lib/utils';

interface JumperLayerProps {
  links: JumperLink[];
  scale: number;
  /** Objects whose jumpers are drawn in full (the selection). */
  focusIds: string[];
  /** Every jumper, faint and without labels (the "Jumpers" switch). */
  showAll: boolean;
  /** Types shown with `showAll`; empty = all. */
  filter: JumperType[];
  /** Colour by install status instead of by cable type. */
  statusColors: boolean;
  selectedJumperId: string | null;
  /** Length of one cable of a jumper (ft), null without a scale. */
  lengthOf: (link: JumperLink) => number | null;
  /** The PM can change the selected jumper right on the plan. */
  editable: boolean;
  /** Lines can be clicked (select tool). */
  interactive: boolean;
  /** Jumper being drawn (jumper tool): its first object, waypoints and where the mouse is. */
  draft: { from: EditorObject; points: Point[]; hover: Point | null; color: string } | null;
  /** Jumper tool: the object a click would pick now (mouse over it), highlighted with its name. */
  target?: EditorObject | null;
  /** …as the other end (a jumper is being drawn) rather than the first one. */
  targetIsEnd?: boolean;
  targetColor?: string;
  onSelect: (link: JumperLink) => void;
  onGoTo: (objectId: string) => void;
  onUpdate: (link: JumperLink, updates: Partial<Jumper>) => void;
  onDelete: (link: JumperLink) => void;
}

const colorOf = (j: Jumper, statusColors: boolean) =>
  (statusColors && statusOf(jumperStatus(j))?.hex) || jumperColor(j);

/** A jumper is only pulled or not: shown with those two statuses' colours. */
const jumperStatus = (j: Jumper) => (isJumperPulled(j) ? 'CABLE_PULLED' : 'PLANNED');

/**
 * Jumpers on the plan, shown in steps so the plan never drowns in lines:
 * the selected objects' jumpers as dashed arcs with a label (type, count, length, status) and a
 * pulsing ring at the other end; with "Jumpers" on, every other one as a faint arc (label on hover).
 */
export const JumperLayer = ({
  links, scale, focusIds, showAll, filter, statusColors, selectedJumperId, lengthOf, editable, interactive, draft,
  target = null, targetIsEnd = false, targetColor = '#0891b2', onSelect, onGoTo, onUpdate, onDelete,
}: JumperLayerProps) => {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const layout = useMemo(() => layoutJumpers(links), [links]);
  const focus = useMemo(() => new Set(focusIds), [focusIds]);
  const shown = useMemo(() => links
    .map(link => {
      const focused = focus.has(link.from.id) || focus.has(link.to.id) || link.jumper.id === selectedJumperId;
      if (!focused && !(showAll && jumperHasType(link.jumper, filter))) return null;
      return { link, focused, geometry: layout.get(link.jumper.id)! };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    // Focused ones on top.
    .sort((x, y) => Number(x.focused) - Number(y.focused)),
  [links, layout, focus, showAll, filter, selectedJumperId]);

  // Over the object it would end at, the preview snaps to its centre.
  const draftEnd = draft && target && targetIsEnd ? centerOf(target) : draft?.hover;
  const draftPts = draft ? [centerOf(draft.from), ...draft.points, ...(draftEnd ? [draftEnd] : [])] : [];

  return (
    <>
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" style={{ zIndex: 16 }} data-no-marquee data-testid="jumper-layer">
        {shown.map(({ link, focused, geometry }) => {
          const color = colorOf(link.jumper, statusColors);
          const d = jumperPathD(geometry, scale);
          const selected = link.jumper.id === selectedJumperId;
          const strong = focused || hoverId === link.jumper.id;
          return (
            <g key={link.jumper.id}>
              {strong && <path d={d} fill="none" stroke="white" strokeWidth={selected ? 7 : 5} strokeOpacity={0.85} strokeLinecap="round" strokeLinejoin="round" />}
              <path
                d={d} fill="none" stroke={color}
                strokeWidth={selected ? 3.5 : strong ? 2.5 : 1.5}
                strokeOpacity={strong ? 1 : 0.45}
                strokeDasharray={strong ? '7 4' : '4 4'}
                strokeLinecap="round" strokeLinejoin="round"
                data-testid="jumper-line"
              />
              {strong && link.jumper.points?.map((p, i) => (
                <circle key={i} cx={p.x * scale} cy={p.y * scale} r={2.5} fill="white" stroke={color} strokeWidth={1.5} />
              ))}
              {interactive && (
                // Wide invisible stroke: easy to hit, shows the label on hover.
                <path
                  d={d} fill="none" stroke="transparent" strokeWidth={12}
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onPointerEnter={() => setHoverId(link.jumper.id)}
                  onPointerLeave={() => setHoverId(h => (h === link.jumper.id ? null : h))}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onSelect(link); }}
                />
              )}
            </g>
          );
        })}

        {draftPts.length > 1 && (
          <polyline
            points={draftPts.map(p => `${p.x * scale},${p.y * scale}`).join(' ')}
            fill="none" stroke={draft!.color} strokeWidth={2} strokeDasharray="6 4" strokeLinejoin="round"
          />
        )}
        {draft?.points.map((p, i) => (
          <circle key={i} cx={p.x * scale} cy={p.y * scale} r={3} fill="white" stroke={draft!.color} strokeWidth={1.5} />
        ))}
      </svg>

      {target && (
        <div
          className="absolute pointer-events-none rounded-md"
          style={{
            left: target.x * scale - 5, top: target.y * scale - 5, width: target.width * scale + 10, height: target.height * scale + 10,
            zIndex: 45, border: `2.5px solid ${targetColor}`, boxShadow: `0 0 0 4px ${targetColor}33, 0 0 12px ${targetColor}88`,
          }}
          data-testid="jumper-target"
        >
          <span
            className="absolute left-1/2 -top-1 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold text-white shadow"
            style={{ backgroundColor: targetColor }}
          >
            {targetIsEnd ? '→ ' : 'From '}{target.name || objectTypeName(target)}
          </span>
        </div>
      )}

      {/* The other end of each focused jumper pulses, so it is found at a glance. */}
      {shown.filter(s => s.focused).map(({ link }) => {
        const far = focus.has(link.from.id) && !focus.has(link.to.id) ? link.to : focus.has(link.to.id) && !focus.has(link.from.id) ? link.from : null;
        if (!far) return null;
        const c = centerOf(far);
        const size = Math.max(far.width, far.height) * scale + 10;
        return (
          <button
            key={`end-${link.jumper.id}`}
            type="button"
            className="absolute rounded-full border-2 animate-pulse"
            style={{
              left: c.x * scale - size / 2, top: c.y * scale - size / 2, width: size, height: size, zIndex: 19,
              borderColor: colorOf(link.jumper, statusColors), pointerEvents: interactive ? 'auto' : 'none',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onGoTo(far.id); }}
            title={`Go to ${far.name || 'the other end'}`}
            data-no-marquee
            data-testid="jumper-far-end"
          />
        );
      })}

      {/* Labels: focused jumpers always, the others while hovered. */}
      {shown.filter(s => s.focused || s.link.jumper.id === hoverId).map(({ link, geometry }) => {
        const j = link.jumper;
        const color = colorOf(j, statusColors);
        const status = statusOf(jumperStatus(j));
        const selected = j.id === selectedJumperId;
        const ft = lengthOf(link);
        return (
          <div
            key={`label-${j.id}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
            style={{ left: geometry.mid.x * scale, top: geometry.mid.y * scale, zIndex: selected ? 47 : 46 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            data-no-marquee
          >
            <button
              type="button"
              className={cn(
                'flex items-center gap-1 whitespace-nowrap rounded-full border bg-background/95 px-1.5 py-0.5 text-[10px] font-semibold shadow-sm',
                selected && 'ring-2 ring-offset-1',
              )}
              style={{ color, borderColor: color, ...(selected ? { ['--tw-ring-color' as string]: color } : {}) }}
              onClick={() => onSelect(link)}
              title={`${link.from.name || 'Object'} → ${link.to.name || 'object'}${isJumperPulled(j) ? ' · pulled' : ' · not pulled'}`}
              data-testid="jumper-label"
            >
              {status && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.hex }} />}
              {j.label ? `${j.label} · ` : ''}{jumperTitle(j)}{ft !== null ? ` · ${formatJumperFeet(ft)}` : ''}
            </button>
            {selected && editable && (
              <div className="flex items-center gap-0.5 rounded-full border border-border bg-background px-1 py-0.5 shadow" data-testid="jumper-quick-edit">
                <JumperCablesPicker cables={j.cables} onChange={(cables) => onUpdate(link, { cables })} className="flex-nowrap" />
                <button type="button" className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground" onClick={() => onDelete(link)} title="Delete jumper (Del)" data-testid="delete-jumper">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
