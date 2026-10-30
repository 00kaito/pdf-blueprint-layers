import React, {useMemo, useState} from 'react';
import {Replace} from 'lucide-react';
import {useDocument} from '@/lib/editor-context';
import {EditorObject} from '@/lib/types';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {LvIcon} from './LvIcon';
import {useIconLibrary} from '@/hooks/useIconLibrary';
import {BLINDSPOT_ICON, LV_ICON_TYPES, LV_ICONS, objectTypeName, RACK_ICON} from '@/core/lv-icons';
import {canReplace, type ReplaceTarget} from '@/core/replace-object';
import {isCamera} from '@/core/camera-coverage';

const TARGET_ICONS = LV_ICON_TYPES.filter(t => t !== RACK_ICON && t !== BLINDSPOT_ICON);

/** Same kind of object: same icon type, or the same image. */
const sameKind = (a: EditorObject, b: EditorObject) => a.type === b.type && a.content === b.content;

/**
 * "Replace with…": swaps the selected objects (or every object of that kind on the plan) for another
 * device type / library icon, keeping their label, status, photos, comments, notes and IDF.
 */
export const ReplaceObjectButton = ({ objects }: { objects: EditorObject[] }) => {
  const { state: docState, dispatch } = useDocument();
  const iconLibrary = useIconLibrary();
  const [open, setOpen] = useState(false);
  const [allOfKind, setAllOfKind] = useState(false);

  const first = objects[0];
  const oneKind = objects.every(o => sameKind(o, first));
  const kindName = first ? objectTypeName(first, docState.customIcons) : '';
  const ofKind = useMemo(
    () => (oneKind && first ? docState.objects.filter(o => canReplace(o) && sameKind(o, first)) : []),
    [oneKind, first, docState.objects],
  );
  if (!first || !objects.every(canReplace)) return null;

  const targets = allOfKind && ofKind.length > objects.length ? ofKind : objects;
  const losesCamera = targets.some(isCamera);

  const replace = (target: ReplaceTarget) => {
    dispatch({ type: 'REPLACE_OBJECTS', payload: { ids: targets.map(o => o.id), target } });
    setOpen(false);
    setAllOfKind(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-2" data-testid="replace-object">
          <Replace className="w-3.5 h-3.5" />
          Replace with…
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" side="left" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium">Replace {targets.length === 1 ? kindName : `${targets.length} objects`}</h4>
            <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
              Keeps label, status, issue, notes, photos, comments, IDF and position.
              {losesCamera && ' Camera field of view is kept only when replaced with a camera.'}
            </p>
          </div>

          {oneKind && ofKind.length > objects.length && (
            <div className="flex items-start gap-2">
              <Checkbox id="replace-all-of-kind" checked={allOfKind} onCheckedChange={(v) => setAllOfKind(v === true)} className="mt-0.5" />
              <Label htmlFor="replace-all-of-kind" className="text-xs font-normal cursor-pointer leading-snug">
                All {ofKind.length} “{kindName}” on the plan
              </Label>
            </div>
          )}

          <div>
            <h5 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Low Voltage</h5>
            <div className="grid grid-cols-5 gap-1.5">
              {TARGET_ICONS.map(icon => (
                <Button
                  key={icon} variant="outline" size="icon" className="h-9 w-full"
                  title={LV_ICONS[icon].label} aria-label={LV_ICONS[icon].label}
                  disabled={targets.every(o => o.type === 'icon' && o.content === icon)}
                  onClick={() => replace({ type: 'icon', content: icon })}
                >
                  <LvIcon type={icon} className="w-4 h-4" />
                </Button>
              ))}
            </div>
          </div>

          {iconLibrary.icons.length > 0 && (
            <div>
              <h5 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">My Icons</h5>
              <div className="grid grid-cols-5 gap-1.5 max-h-32 overflow-y-auto p-0.5">
                {iconLibrary.icons.map(icon => (
                  <Button
                    key={icon.id} variant="outline" size="icon" className="h-9 w-full p-1"
                    title={icon.name} aria-label={icon.name}
                    onClick={() => replace({ type: 'image', content: icon.dataUrl })}
                  >
                    <img src={icon.dataUrl} alt="" className="max-h-full max-w-full object-contain" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
