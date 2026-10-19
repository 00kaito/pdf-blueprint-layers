import React from 'react';
import {Check, GitPullRequestArrow} from 'lucide-react';
import {useDocumentDispatch} from '@/lib/editor-context';
import {EditorObject, PlanChange} from '@/lib/types';
import {PLAN_CHANGE_BY_ID, PLAN_CHANGES} from '@/core/plan-change';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {cn} from '@/lib/utils';
import {useCurrentUser} from '@/hooks/useAuth';

/** Design change of the selected objects (to be relocated / removed …); read-only for TECH. */
export const PlanChangeSection = ({ objects, large = false }: { objects: EditorObject[]; large?: boolean }) => {
  const dispatch = useDocumentDispatch();
  const { data: user } = useCurrentUser();
  const readOnly = user?.role === 'TECH';
  const first = objects[0];
  if (!first) return null;

  const common = objects.every(o => o.change === first.change) ? first.change : undefined;
  const commonNote = objects.every(o => o.changeNote === first.changeNote) ? (first.changeNote || '') : '';
  const ids = objects.map(o => o.id);

  const update = (updates: Partial<EditorObject>) => {
    if (readOnly) return;
    dispatch({ type: 'UPDATE_OBJECTS', payload: { ids, updates } });
  };

  const setChange = (change: PlanChange | undefined) => update({
    change,
    changeUpdatedAt: new Date().toISOString(),
    changeUpdatedBy: user?.username || 'Unknown',
  });

  if (readOnly) {
    if (!objects.some(o => o.change)) return null;
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Plan change</Label>
        <div className="text-xs bg-muted/50 p-2 rounded border border-border">
          {common ? PLAN_CHANGE_BY_ID[common].label : 'Mixed'}
          {commonNote && <div className="text-muted-foreground mt-1 whitespace-pre-wrap">{commonNote}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className={cn("font-medium flex items-center gap-1", large ? "text-sm" : "text-xs")}>
        <GitPullRequestArrow className="w-3 h-3" />
        Plan change
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {PLAN_CHANGES.map(c => (
          <Button
            key={c.id}
            variant="outline"
            size="sm"
            className={cn(
              "justify-start gap-1.5 font-semibold",
              large ? "h-12 text-[13px] px-3" : "h-8 text-[10px] px-1",
              common === c.id && "ring-2 ring-primary ring-offset-1"
            )}
            onClick={() => setChange(common === c.id ? undefined : c.id)}
            data-testid={`plan-change-${c.id}`}
          >
            <span className="w-4 text-center font-black" style={{ color: c.color }}>{c.badge}</span>
            {c.label}
          </Button>
        ))}
      </div>

      {objects.some(o => o.change) && (
        <>
          <Textarea
            placeholder="Reason / instructions (e.g. move 3 ft east per RFI-12)"
            value={commonNote}
            onChange={(e) => update({ changeNote: e.target.value })}
            className="text-xs min-h-[48px]"
          />
          <Button
            variant="secondary"
            size="sm"
            className={cn("w-full gap-1.5", large ? "h-11" : "h-8 text-xs")}
            onClick={() => common === 'REMOVE'
              ? dispatch({ type: 'DELETE_OBJECTS', payload: ids })
              : update({ change: undefined, changeNote: undefined })}
            data-testid="plan-change-done"
          >
            <Check className="w-3.5 h-3.5" />
            {common === 'RELOCATE' ? 'Relocation done' : common === 'REMOVE' ? 'Removed — delete point' : 'Change done'}
          </Button>
          {first.changeUpdatedAt && objects.length === 1 && (
            <div className="text-[10px] text-muted-foreground italic px-1">
              Marked: {new Date(first.changeUpdatedAt).toLocaleString()} by {first.changeUpdatedBy}
            </div>
          )}
        </>
      )}
    </div>
  );
};
