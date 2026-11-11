import React, {useMemo, useState} from 'react';
import {AlertTriangle, Cable, Check, ChevronDown, ChevronRight, Plus, Trash2} from 'lucide-react';
import {useDocument, useUI} from '@/lib/editor-context';
import type {EditorObject} from '@/lib/types';
import {
  allJumpers, formatJumperFeet, gatedStatus, isJumperPulled, jumperColor, jumperFeet, JumperLink, jumpersOf, jumperTitle,
} from '@/core/jumpers';
import {JumperCablesPicker} from './JumperCablesPicker';
import {parseFeet} from '@/core/measure';
import {statusOf, type ObjectStatus} from '@/core/status';
import {objectTypeName} from '@/core/lv-icons';
import {useFieldActions} from '@/hooks/useFieldActions';
import {startJumperFrom} from '@/hooks/useJumperDrawing';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {cn} from '@/lib/utils';

/**
 * Jumpers at one object (either end): "HDMI → Floor box 3 · 14'" with a Pulled switch — a jumper is only
 * pulled or not, and until every one at the object is, the object cannot show "pulled" or later.
 * Everyone sets Pulled (a technician's goes to the server); the PM also edits type, count, label and length, deletes, and
 * adds new ones ("+ Jumper" starts the jumper tool from this object).
 */
export const JumperEditor = ({ object, large = false }: { object: EditorObject; large?: boolean }) => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const { isTech, setJumperStatus } = useFieldActions();
  const links = useMemo(() => jumpersOf(allJumpers(docState.objects), object.id), [docState.objects, object.id]);
  const [openId, setOpenId] = useState<string | null>(null);
  const expanded = openId ?? uiState.selectedJumperId;

  if (isTech && links.length === 0) return null;
  const rowH = large ? 'h-10' : 'h-8';
  const missing = links.filter(l => !isJumperPulled(l.jumper)).length;
  const heldBack = gatedStatus(object.status, missing > 0) !== object.status;

  return (
    <div className="space-y-2" data-testid="jumper-editor">
      <Label className={cn('font-medium flex items-center gap-1', large ? 'text-sm' : 'text-xs')}>
        <Cable className="w-3 h-3" />
        Jumpers {links.length > 0 && <span className="text-muted-foreground font-normal">({links.length - missing}/{links.length} pulled)</span>}
      </Label>

      {heldBack && (
        <div className="flex items-start gap-1.5 rounded border border-amber-300 bg-amber-50 p-1.5 text-[11px] text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200" data-testid="jumper-held-back">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Set to <b>{statusOf(object.status)?.label}</b>, but shown as Planned until {missing === 1 ? 'the jumper below is' : `these ${missing} jumpers are`} pulled.
          </span>
        </div>
      )}

      {links.map(link => (
        <JumperRow
          key={link.jumper.id}
          link={link}
          here={object.id}
          open={expanded === link.jumper.id}
          onToggle={() => {
            const open = expanded === link.jumper.id;
            setOpenId(open ? '' : link.jumper.id);
            dispatch({ type: 'SELECT_JUMPER', payload: open ? null : link.jumper.id });
          }}
          feet={jumperFeet(link, docState.measureCalibration, docState.lvSettings)}
          readOnly={isTech}
          rowH={rowH}
          onStatus={(s) => setJumperStatus(link.from.id, link.jumper.id, s)}
        />
      ))}

      {!isTech && (
        <Button
          variant="outline"
          size="sm"
          className={cn('w-full gap-1.5 text-xs', rowH)}
          onClick={() => startJumperFrom(dispatch, object.id)}
          data-testid="jumper-add"
        >
          <Plus className="w-3 h-3" />
          Jumper — then click the other object
        </Button>
      )}
    </div>
  );
};

const JumperRow = ({ link, here, open, onToggle, feet, readOnly, rowH, onStatus }: {
  link: JumperLink; here: string; open: boolean; onToggle: () => void; feet: number | null;
  readOnly: boolean; rowH: string; onStatus: (s: ObjectStatus) => void;
}) => {
  const { dispatch } = useDocument();
  const j = link.jumper;
  const other = link.from.id === here ? link.to : link.from;
  const color = jumperColor(j);
  const update = (updates: Partial<typeof j>) => dispatch({ type: 'UPDATE_JUMPER', payload: { fromId: link.from.id, id: j.id, updates } });
  const [lengthText, setLengthText] = useState<string | null>(null);
  const pulled = isJumperPulled(j);

  return (
    <div className={cn('rounded border', open ? 'border-border bg-muted/30' : 'border-transparent')} data-testid="jumper-row">
      <div className="flex items-center gap-1">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-1 text-left text-xs hover:bg-muted" onClick={onToggle}>
          {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          <span className="inline-block w-3 shrink-0 border-t-2 border-dashed" style={{ borderColor: color }} />
          <span className="font-semibold" style={{ color }}>{jumperTitle(j)}</span>
          <span className="truncate">→ {other.name || objectTypeName(other)}</span>
          {feet !== null && <span className="shrink-0 text-muted-foreground">· {formatJumperFeet(feet)}</span>}
        </button>
        <button
          type="button"
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold', rowH,
            pulled ? 'border-blue-500 bg-blue-500 text-white' : 'border-red-300 bg-background text-red-500',
          )}
          onClick={() => onStatus(pulled ? 'PLANNED' : 'CABLE_PULLED')}
          aria-pressed={pulled}
          title={pulled ? `Pulled${j.statusUpdatedBy ? ` (${j.statusUpdatedBy})` : ''} — click to mark not pulled` : 'Mark as pulled'}
          data-testid="jumper-pulled"
        >
          {pulled ? <Check className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-red-400" />}
          {pulled ? 'Pulled' : 'Not pulled'}
        </button>
      </div>

      {open && (
        <div className="space-y-1.5 px-1 pb-1.5 pt-0.5">
          {readOnly ? (
            <div className="text-[11px] text-muted-foreground">
              {j.label ? `${j.label} · ` : ''}{jumperTitle(j)}{j.lengthFt ? ` · ${j.lengthFt} ft (set)` : ''}
              {j.statusUpdatedBy && ` · ${j.statusUpdatedBy}`}
            </div>
          ) : (
            <>
              <JumperCablesPicker cables={j.cables} onChange={(cables) => update({ cables })} large={rowH === 'h-10'} />
              <div className="flex items-center gap-1">
                <Input
                  value={j.label ?? ''}
                  onChange={(e) => update({ label: e.target.value || undefined })}
                  placeholder="Label (e.g. HDMI 1)"
                  className={cn('min-w-0 flex-1 text-xs', rowH)}
                />
                <Input
                  value={lengthText ?? (j.lengthFt ? String(j.lengthFt) : '')}
                  onChange={(e) => setLengthText(e.target.value)}
                  onBlur={() => {
                    if (lengthText === null) return;
                    const ft = parseFeet(lengthText);
                    update({ lengthFt: ft ?? undefined });
                    setLengthText(null);
                  }}
                  placeholder={feet !== null && !j.lengthFt ? `${Math.ceil(feet)} ft` : 'Length ft'}
                  title="Length per cable (ft); empty = measured on the plan + slack at both ends"
                  className={cn('w-20 shrink-0 text-xs', rowH)}
                />
              </div>
              <div className="flex items-center justify-between gap-1">
                {j.points?.length ? (
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={() => update({ points: undefined })}>
                    Remove {j.points.length} waypoint{j.points.length > 1 ? 's' : ''}
                  </Button>
                ) : <span />}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-[11px] text-destructive"
                  onClick={() => dispatch({ type: 'DELETE_JUMPER', payload: { fromId: link.from.id, id: j.id } })}
                  data-testid="jumper-delete"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
