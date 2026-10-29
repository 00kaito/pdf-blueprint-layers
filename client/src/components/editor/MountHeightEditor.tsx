import React, {useEffect, useState} from 'react';
import {ArrowUpToLine, Ruler} from 'lucide-react';
import {useDocumentDispatch} from '@/lib/editor-context';
import {EditorObject} from '@/lib/types';
import {DEFAULT_MOUNT_HEIGHT_IN, formatMountHeight, MOUNT_CEILING, mountHeightIn} from '@/core/lv-icons';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Toggle} from '@/components/ui/toggle';
import {cn} from '@/lib/utils';

/** Highest mount height accepted, inches (30 ft). */
const MAX_IN = 360;

/**
 * Typed height → inches: `60` or `60"` = inches, `5'`, `5' 6"`, `5ft 6in`, `5.5ft` = feet (+ inches).
 * Empty = back to the type's default (undefined); null = not a height.
 */
export const parseMountHeight = (text: string): number | undefined | null => {
  const t = text.trim().toLowerCase();
  if (!t) return undefined;
  const feet = t.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|″|in|inch|inches)?)?$/);
  if (feet) return Math.min(MAX_IN, parseFloat(feet[1]) * 12 + (feet[2] ? parseFloat(feet[2]) : 0));
  const inches = t.match(/^(\d+(?:\.\d+)?)\s*(?:"|″|in|inch|inches)?$/);
  return inches ? Math.min(MAX_IN, parseFloat(inches[1])) : null;
};

/** Default of the selection's type(s), for the placeholder; null when the types differ or have none. */
const typeDefault = (objects: EditorObject[]) => {
  const values = new Set(objects.map(o => (o.type === 'icon' && o.content ? DEFAULT_MOUNT_HEIGHT_IN[o.content] : undefined)));
  return values.size === 1 ? values.values().next().value : null;
};

/**
 * Mount height above the finished floor of the selected devices — install info for the team, and the
 * cable drop from the ceiling (once the project has a ceiling height). Empty = the type's default.
 */
export const MountHeightEditor = ({ objects, readOnly = false, large = false }: {
  objects: EditorObject[]; readOnly?: boolean; large?: boolean;
}) => {
  const dispatch = useDocumentDispatch();
  const own = new Set(objects.map(o => o.mountHeightIn ?? null));
  const ownValue = own.size === 1 ? own.values().next().value : undefined;
  const effective = new Set(objects.map(mountHeightIn));
  const mixed = effective.size > 1;
  const inCeiling = !mixed && effective.has(MOUNT_CEILING);
  const def = typeDefault(objects);

  const shown = ownValue === undefined || ownValue === null || ownValue === MOUNT_CEILING ? '' : String(ownValue);
  const [draft, setDraft] = useState(shown);
  useEffect(() => setDraft(shown), [shown]);

  const apply = (value: number | undefined) => {
    for (const o of objects) {
      if (o.mountHeightIn === value) continue;
      dispatch({ type: 'UPDATE_OBJECT', payload: { id: o.id, updates: { mountHeightIn: value } } });
    }
  };

  const commit = () => {
    const value = parseMountHeight(draft);
    if (value === null) { setDraft(shown); return; }
    setDraft(value === undefined ? '' : String(value));
    apply(value);
  };

  const placeholder = mixed
    ? 'Mixed'
    : inCeiling ? 'In the ceiling (type a height to change)'
    : def !== null && def !== undefined && def !== MOUNT_CEILING ? `${formatMountHeight(def)} (default)` : 'e.g. 60 or 5\' 0"';

  if (readOnly) {
    const value = !mixed ? effective.values().next().value : undefined;
    return (
      <div className="space-y-1" data-testid="mount-height">
        <Label className={cn("font-medium flex items-center gap-1", large ? "text-sm" : "text-xs")}>
          <Ruler className="w-3 h-3" /> Mount height
        </Label>
        <p className={cn(large ? "text-base font-semibold" : "text-xs")}>
          {mixed ? 'Mixed' : value === undefined ? '—' : value === MOUNT_CEILING ? 'In the ceiling' : `${formatMountHeight(value)} AFF`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1" data-testid="mount-height">
      <Label className={cn("font-medium flex items-center gap-1", large ? "text-sm" : "text-xs")}>
        <Ruler className="w-3 h-3" /> Mount height (AFF)
      </Label>
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className={cn("text-xs flex-1", large ? "h-10" : "h-8")}
          title={`Inches (60) or feet and inches (5' 6"); empty = the type's default`}
          data-testid="mount-height-input"
        />
        <Toggle
          pressed={inCeiling}
          // Off goes back to the type's height; ceiling-type devices (cameras, WAPs) get a typed height instead.
          onPressedChange={(p) => { if (p) apply(MOUNT_CEILING); else if (def !== MOUNT_CEILING) apply(undefined); }}
          size="sm"
          className={cn("gap-1 text-xs border border-input px-2", large ? "h-10" : "h-8")}
          title="Mounted in the ceiling (no drop from the ceiling)"
          data-testid="mount-height-ceiling"
        >
          <ArrowUpToLine className="w-3.5 h-3.5" /> Ceiling
        </Toggle>
      </div>
      {!mixed && !inCeiling && draft.trim() !== '' && parseMountHeight(draft) && (
        <p className="text-[10px] text-muted-foreground">{formatMountHeight(parseMountHeight(draft)!)} above the floor</p>
      )}
    </div>
  );
};
