import React, {useEffect, useState} from 'react';
import {Video} from 'lucide-react';
import {useDocumentDispatch} from '@/lib/editor-context';
import {EditorObject} from '@/lib/types';
import {cameraDefaults} from '@/core/camera-coverage';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {cn} from '@/lib/utils';

type Field = 'rangeFt' | 'angleDeg';

const LIMITS: Record<Field, [number, number]> = { rangeFt: [1, 200], angleDeg: [10, 360] };

/**
 * One number of the camera's field of view. Committed on blur / Enter (clamping on every keystroke
 * would turn "6" of "60" into the minimum); empty = back to the default.
 */
const SpecInput = ({ objects, field, readOnly, large }: {
  objects: EditorObject[]; field: Field; readOnly: boolean; large: boolean;
}) => {
  const dispatch = useDocumentDispatch();
  const values = new Set(objects.map(o => o.camera?.[field] ?? null));
  // The type's default (regular / 360°); a mix of types has no single one.
  const defaults = new Set(objects.map(o => cameraDefaults(o)[field]));
  const placeholder = values.size > 1 || defaults.size > 1 ? 'Mixed' : String(defaults.values().next().value);
  const shown = values.size === 1 ? (objects[0].camera?.[field] ?? '') : '';
  const [draft, setDraft] = useState<string>(String(shown));
  useEffect(() => setDraft(String(shown)), [shown]);

  const commit = () => {
    const n = parseFloat(draft);
    const [min, max] = LIMITS[field];
    const value = draft.trim() === '' || !Number.isFinite(n) ? undefined : Math.min(max, Math.max(min, n));
    setDraft(value === undefined ? '' : String(value));
    for (const o of objects) {
      if ((o.camera?.[field] ?? undefined) === value) continue;
      dispatch({ type: 'UPDATE_OBJECT', payload: { id: o.id, updates: { camera: { ...o.camera, [field]: value } } } });
    }
  };

  return (
    <Input
      type="number"
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      disabled={readOnly}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={cn("text-xs", large ? "h-10" : "h-8")}
      data-testid={`camera-${field}`}
    />
  );
};

/** Field of view of the selected CCTV cameras: range in feet and view angle (defaults per type, see `cameraDefaults`). */
export const CameraCoverageEditor = ({ objects, readOnly = false, large = false }: {
  objects: EditorObject[]; readOnly?: boolean; large?: boolean;
}) => (
  <div className="space-y-2" data-testid="camera-coverage-editor">
    <Label className={cn("font-medium flex items-center gap-1", large ? "text-sm" : "text-xs")}>
      <Video className="w-3 h-3" />
      Camera coverage
    </Label>
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">Range (ft)</span>
        <SpecInput objects={objects} field="rangeFt" readOnly={readOnly} large={large} />
      </div>
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">View angle (°)</span>
        <SpecInput objects={objects} field="angleDeg" readOnly={readOnly} large={large} />
      </div>
    </div>
  </div>
);
