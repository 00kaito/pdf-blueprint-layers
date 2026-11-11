import React from 'react';
import {Minus, Plus} from 'lucide-react';
import type {JumperCable} from '@/lib/types';
import {JUMPER_TYPES, stepJumperCable, toggleJumperCable} from '@/core/jumpers';
import {cn} from '@/lib/utils';

/**
 * What runs along one jumper: a chip per cable type — tap to add / remove it, − / + for how many.
 * Several types share one line on the plan (Cat6 + HDMI + USB-C to a TV). At least one stays.
 * Used for a new jumper (jumper tool), on the plan and in the properties panel.
 */
export const JumperCablesPicker = ({ cables, onChange, large = false, className }: {
  cables: JumperCable[]; onChange: (cables: JumperCable[]) => void; large?: boolean; className?: string;
}) => {
  const h = large ? 'h-8' : 'h-6';
  const step = large ? 'h-6 w-6' : 'h-4 w-4';
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)} data-testid="jumper-cables-picker">
      {JUMPER_TYPES.map(t => {
        const c = cables.find(x => x.type === t.id);
        if (!c) {
          return (
            <button
              key={t.id}
              type="button"
              className={cn('rounded-full border bg-background px-2 font-semibold whitespace-nowrap', h, large ? 'text-xs' : 'text-[11px]')}
              style={{ color: t.color, borderColor: t.color }}
              onClick={() => onChange(toggleJumperCable(cables, t.id))}
              title={`Add ${t.label}`}
              data-testid={`jumper-cable-${t.id}`}
            >
              {t.label}
            </button>
          );
        }
        return (
          <span
            key={t.id}
            className={cn('flex items-center gap-0.5 rounded-full border pl-2 pr-0.5 font-semibold text-white whitespace-nowrap', h, large ? 'text-xs' : 'text-[11px]')}
            style={{ backgroundColor: t.color, borderColor: t.color }}
            data-testid={`jumper-cable-${t.id}-on`}
          >
            <button type="button" onClick={() => onChange(toggleJumperCable(cables, t.id))} title={cables.length > 1 ? `Remove ${t.label}` : undefined}>
              {t.label}
            </button>
            <button type="button" className={cn('ml-0.5 flex items-center justify-center rounded-full bg-white/25 hover:bg-white/40', step)}
              onClick={() => onChange(stepJumperCable(cables, t.id, -1))} aria-label={`Fewer ${t.label}`}>
              <Minus className="h-2.5 w-2.5" />
            </button>
            <span className="min-w-3 text-center tabular-nums">{c.count}</span>
            <button type="button" className={cn('flex items-center justify-center rounded-full bg-white/25 hover:bg-white/40', step)}
              onClick={() => onChange(stepJumperCable(cables, t.id, 1))} aria-label={`More ${t.label}`}>
              <Plus className="h-2.5 w-2.5" />
            </button>
          </span>
        );
      })}
    </div>
  );
};
