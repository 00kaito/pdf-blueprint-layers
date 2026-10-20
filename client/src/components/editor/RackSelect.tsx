import React, {useMemo} from 'react';
import {Server} from 'lucide-react';
import {useDocument} from '@/lib/editor-context';
import {EditorObject} from '@/lib/types';
import {computeCableRuns, getRacks, hasCables, rackColorMap, rackLabel, runFeet} from '@/core/cable-routing';
import {formatFeet} from '@/core/measure';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

const AUTO = '__auto__';

const Dot = ({ color }: { color?: string }) =>
  <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: color }} />;

/**
 * IDF / rack the selected devices home-run to (nearest by cable run unless picked), with the run
 * length. The cable then follows only that IDF's routes.
 */
export const RackSelect = ({ objects, readOnly = false }: { objects: EditorObject[]; readOnly?: boolean }) => {
  const { state: docState, dispatch } = useDocument();
  const racks = useMemo(() => getRacks(docState.objects), [docState.objects]);
  const colors = useMemo(() => rackColorMap(docState.objects), [docState.objects]);
  const runs = useMemo(
    () => computeCableRuns(docState.objects, docState.cableRoutes),
    [docState.objects, docState.cableRoutes],
  );
  if (racks.length === 0 || objects.length === 0) return null;

  const first = objects[0];
  const picked = objects.every(o => o.metadata?.rackId === first.metadata?.rackId) ? (first.metadata?.rackId || AUTO) : '';
  const single = objects.length === 1 && hasCables(first) ? runs.get(first.id) : undefined;
  const feet = single ? runFeet(single, docState.measureCalibration, docState.lvSettings) : null;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium flex items-center gap-1">
        <Server className="w-3 h-3" />
        Cable goes to (IDF)
      </Label>
      <Select
        value={picked}
        disabled={readOnly}
        onValueChange={(v) => {
          for (const o of objects) {
            dispatch({
              type: 'UPDATE_OBJECT',
              payload: { id: o.id, updates: { metadata: { ...(o.metadata || {}), rackId: v === AUTO ? undefined : v } } },
            });
          }
        }}
      >
        <SelectTrigger className="h-8 text-xs" data-testid="rack-select">
          <SelectValue placeholder="Mixed" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AUTO}>
            Nearest{single && picked === AUTO ? ` (${rackLabel(racks, single.rackId)})` : ''}
          </SelectItem>
          {racks.map(r => (
            <SelectItem key={r.id} value={r.id}>
              <Dot color={colors.get(r.id)} />{rackLabel(racks, r.id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {objects.length === 1 && !hasCables(first) && (
        <div className="text-[10px] text-muted-foreground px-1" data-testid="cable-run-length">No cables — add one to see its run.</div>
      )}
      {single && (
        <div className="text-[10px] text-muted-foreground px-1" data-testid="cable-run-length">
          {feet !== null
            ? <>
                <Dot color={colors.get(single.rackId)} />
                {rackLabel(racks, single.rackId)}: <span className="font-medium text-foreground">{formatFeet(Math.round(feet))}</span> per cable
                {!single.routed && ' (est. — no route of this IDF)'}
              </>
            : 'Set the measuring scale to see the run length.'}
        </div>
      )}
    </div>
  );
};
