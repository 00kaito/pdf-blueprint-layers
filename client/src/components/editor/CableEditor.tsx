import React from 'react';
import {Cable, Minus, Plus, X} from 'lucide-react';
import {useDocumentDispatch} from '@/lib/editor-context';
import {CableSpec, CableType, EditorObject} from '@/lib/types';
import {CABLE_TYPES, deviceKey, formatCables, objectTypeName} from '@/core/lv-icons';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {cn} from '@/lib/utils';

const sameCables = (a: CableSpec[] | undefined, b: CableSpec[] | undefined) =>
  JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

/**
 * Cables of the selected devices (type × count). Whatever is set here also becomes the default for
 * new devices of the same type, so it only has to be entered once per device type.
 */
export const CableEditor = ({ objects, readOnly = false, large = false }: {
  objects: EditorObject[]; readOnly?: boolean; large?: boolean;
}) => {
  const dispatch = useDocumentDispatch();
  const first = objects[0];
  if (!first) return null;

  const mixed = objects.some(o => !sameCables(o.cables, first.cables));
  const cables = mixed ? [] : (first.cables ?? []);
  const ids = objects.map(o => o.id);

  const set = (next: CableSpec[]) => dispatch({ type: 'SET_OBJECT_CABLES', payload: { ids, cables: next } });
  const updateRow = (i: number, patch: Partial<CableSpec>) =>
    set(cables.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const keys = Array.from(new Set(objects.map(deviceKey).filter((k): k is string => !!k)));
  const typeLabel = keys.length === 1 ? (first.type === 'icon' ? objectTypeName(first) : 'this icon') : null;

  if (readOnly) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Cables</Label>
        <div className="text-xs bg-muted/50 p-2 rounded border border-border min-h-[32px] flex items-center">
          {mixed ? 'Mixed' : formatCables(cables)}
        </div>
      </div>
    );
  }

  const rowH = large ? 'h-10' : 'h-8';

  return (
    <div className="space-y-2" data-testid="cable-editor">
      <Label className={cn("font-medium flex items-center gap-1", large ? "text-sm" : "text-xs")}>
        <Cable className="w-3 h-3" />
        Cables
      </Label>

      {mixed && (
        <div className="text-[10px] text-muted-foreground italic">
          Mixed — adding a cable replaces the cables of all {objects.length} objects.
        </div>
      )}

      {cables.map((c, i) => (
        <div key={i} className="flex items-center gap-1">
          <Select value={c.type} onValueChange={(v) => updateRow(i, { type: v as CableType })}>
            {/* min-w-0: a long type name ("Speaker") must shrink, not push the remove button out of the panel. */}
            <SelectTrigger className={cn("text-xs flex-1 min-w-0 px-2", rowH)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CABLE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className={cn("shrink-0", rowH, large ? "w-10" : "w-7")}
            onClick={() => updateRow(i, { count: Math.max(1, c.count - 1) })} aria-label="Fewer">
            <Minus className="w-3 h-3" />
          </Button>
          <Input
            type="number"
            min={1}
            value={c.count}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (n > 0) updateRow(i, { count: Math.min(n, 999) });
            }}
            className={cn("text-xs shrink-0 text-center px-1", large ? "w-12" : "w-9", rowH)}
          />
          <Button variant="outline" size="icon" className={cn("shrink-0", rowH, large ? "w-10" : "w-7")}
            onClick={() => updateRow(i, { count: c.count + 1 })} aria-label="More">
            <Plus className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className={cn("shrink-0 text-muted-foreground", rowH, large ? "w-10" : "w-7")}
            onClick={() => set(cables.filter((_, j) => j !== i))} aria-label="Remove cable">
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        className={cn("w-full gap-1.5 text-xs", rowH)}
        onClick={() => {
          // Next type not used yet. Only access control (24 V) gets a power cable offered.
          const used = new Set(cables.map(c => c.type));
          const order: CableType[] = keys.length > 0 && keys.every(k => k === 'access-control')
            ? ['CAT6', 'POWER', 'SPEAKER']
            : ['CAT6', 'SPEAKER'];
          const type = order.find(t => !used.has(t)) ?? 'OTHER';
          set([...cables, { type, count: 1 }]);
        }}
        data-testid="cable-add"
      >
        <Plus className="w-3 h-3" />
        Add cable
      </Button>

      {typeLabel && (
        <div className="text-[10px] text-muted-foreground px-1">
          New <span className="font-medium">{typeLabel}</span> devices get the same cables.
        </div>
      )}
    </div>
  );
};
