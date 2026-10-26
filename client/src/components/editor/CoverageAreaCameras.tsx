import React from 'react';
import {Video} from 'lucide-react';
import {useDocument} from '@/lib/editor-context';
import {EditorObject} from '@/lib/types';
import {isCamera} from '@/core/camera-coverage';
import {defaultObjectNames} from '@/core/lv-icons';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';

/**
 * Cameras that must see the selected coverage area(s). None ticked = every camera counts; the parts
 * of the area the counted cameras miss show red on the plan.
 */
export const CoverageAreaCameras = ({ areas, readOnly }: { areas: EditorObject[]; readOnly: boolean }) => {
  const { state: docState, dispatch } = useDocument();
  const cameras = docState.objects.filter(isCamera);
  const names = defaultObjectNames(docState.objects, docState.customIcons);
  const ticked = (id: string) => areas.every(a => a.coverageCameraIds?.includes(id));
  const anyPicked = areas.some(a => a.coverageCameraIds?.length);

  const toggle = (id: string, on: boolean) => {
    for (const area of areas) {
      const current = area.coverageCameraIds ?? [];
      const next = on ? Array.from(new Set([...current, id])) : current.filter(c => c !== id);
      dispatch({ type: 'UPDATE_OBJECT', payload: { id: area.id, updates: { coverageCameraIds: next.length ? next : undefined } } });
    }
  };

  return (
    <div className="space-y-2" data-testid="coverage-area-cameras">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Video className="w-3.5 h-3.5 text-muted-foreground" />
        Must be covered by
      </div>
      {cameras.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No cameras on the plan yet.</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {cameras.map(cam => (
            <div key={cam.id} className="flex items-center gap-2">
              <Checkbox
                id={`area-cam-${cam.id}`}
                checked={ticked(cam.id)}
                disabled={readOnly}
                onCheckedChange={(checked) => toggle(cam.id, checked === true)}
              />
              <Label htmlFor={`area-cam-${cam.id}`} className="text-xs font-normal cursor-pointer truncate">
                {cam.name || names.get(cam.id)}
              </Label>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground leading-snug">
        {anyPicked
          ? 'Parts of the area the ticked cameras do not see are red.'
          : 'None ticked: any camera counts. Parts of the area no camera sees are red.'}
      </p>
    </div>
  );
};
