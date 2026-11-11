import React, {useMemo, useState} from 'react';
import {Cable, Check} from 'lucide-react';
import {useDocument} from '@/lib/editor-context';
import type {EditorObject} from '@/lib/types';
import {allJumpers, isJumperPulled, jumperColor, JumperLink, jumpersOf, jumperTitle} from '@/core/jumpers';
import {objectTypeName} from '@/core/lv-icons';
import {useFieldActions} from '@/hooks/useFieldActions';
import {Button} from '@/components/ui/button';
import {Drawer, DrawerContent, DrawerHeader, DrawerTitle} from '@/components/ui/drawer';
import {cn} from '@/lib/utils';

/** Jumpers at an object (either end), with the not-pulled ones. */
export const useObjectJumpers = (objectId: string | undefined) => {
  const { state } = useDocument();
  return useMemo(() => {
    const links = objectId ? jumpersOf(allJumpers(state.objects), objectId) : [];
    return { links, notPulled: links.filter(l => !isJumperPulled(l.jumper)) };
  }, [state.objects, objectId]);
};

/**
 * Phone: the jumpers of the selected object without taking room on the screen — a chip "⇄ 1/2 pulled"
 * on the line under the object's name (nothing when it has none); tapping it opens a sheet where each
 * jumper is one big pulled / not pulled switch, and "Mark all pulled".
 */
export const MobileJumperChip = ({ object, name }: { object: EditorObject; name: string }) => {
  const { links, notPulled } = useObjectJumpers(object.id);
  const [open, setOpen] = useState(false);
  const { setJumperStatus, setJumpersStatus } = useFieldActions();
  if (!links.length) return null;
  const done = notPulled.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={cn(
          'flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-bold whitespace-nowrap',
          done ? 'border-blue-500 bg-blue-500 text-white' : 'border-amber-500 bg-amber-50 text-amber-700',
        )}
        data-testid="mobile-jumper-chip"
      >
        ⇄ {links.length - notPulled.length}/{links.length} pulled
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-1.5">
              <Cable className="h-5 w-5" /> Jumpers — {name}
            </DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto px-4 pb-2" data-testid="mobile-jumper-sheet">
            {links.map(link => (
              <JumperSwitch
                key={link.jumper.id}
                link={link}
                here={object.id}
                onToggle={() => setJumperStatus(link.from.id, link.jumper.id, isJumperPulled(link.jumper) ? 'PLANNED' : 'CABLE_PULLED')}
              />
            ))}
          </div>
          <div className="flex gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            <Button
              className="h-12 flex-1 gap-1.5"
              disabled={done}
              onClick={() => setJumpersStatus(notPulled.map(l => ({ fromId: l.from.id, jumperId: l.jumper.id })), 'CABLE_PULLED')}
              data-testid="mobile-jumpers-all-pulled"
            >
              <Check className="h-5 w-5" /> {done ? 'All pulled' : `Mark all pulled (${notPulled.length})`}
            </Button>
            <Button variant="outline" className="h-12" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

/** One jumper as one big switch: what runs along it, where to, pulled or not. */
const JumperSwitch = ({ link, here, onToggle }: { link: JumperLink; here: string; onToggle: () => void }) => {
  const pulled = isJumperPulled(link.jumper);
  const other = link.from.id === here ? link.to : link.from;
  const color = jumperColor(link.jumper);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={pulled}
      className={cn(
        'flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left active:opacity-80',
        pulled ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-border bg-background',
      )}
      data-testid="mobile-jumper-switch"
    >
      <span className="inline-block w-5 shrink-0 border-t-[3px] border-dashed" style={{ borderColor: color }} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-bold" style={{ color }}>{jumperTitle(link.jumper)}</span>
        <span className="truncate text-xs text-muted-foreground">
          → {other.name || objectTypeName(other)}{link.jumper.label ? ` · ${link.jumper.label}` : ''}
        </span>
      </span>
      <span className={cn(
        'flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold',
        pulled ? 'bg-blue-500 text-white' : 'border border-red-300 text-red-500',
      )}>
        {pulled ? <><Check className="h-4 w-4" /> Pulled</> : 'Not pulled'}
      </span>
    </button>
  );
};
