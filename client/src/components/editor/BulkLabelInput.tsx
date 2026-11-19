import React, {useEffect, useState} from 'react';
import {Route, Waypoints} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {useDocument, useUI} from '@/lib/editor-context';
import {EditorObject} from '@/lib/types';
import {expandLabelPattern, hasNumberPattern} from '@/core/label-pattern';
import {getRacks, orderByIdfDistance, orderByNearestChain} from '@/core/cable-routing';
import {cn} from '@/lib/utils';

interface BulkLabelInputProps {
  objects: EditorObject[];
  className?: string;
  id?: string;
  /** Show the "CAM 1 … CAM 5" preview under the field (the toolbar has no room for it). */
  showPreview?: boolean;
}

const PATTERN_HINT = 'With several objects selected, %1 numbers them in selection order: "CAM %1" → CAM 1, CAM 2… (%01 → 01, 02…; %10 starts at 10). Enter applies.';
const DISTANCE_HINT = 'Number by cable run to the assigned IDF: nearest device first, IDF by IDF.';
const CHAIN_HINT = 'Number as a chain: the first selected object gets the first number, each next one is the nearest unnumbered object to the previous one, preferring the same row (horizontal neighbours).';

/**
 * Label field for one or many objects. Plain text is applied as you type (to all selected objects);
 * a numbering pattern (`%1`) with several objects is applied on Enter / leaving the field, giving
 * each object its own number in the order they were selected.
 */
export const BulkLabelInput = ({ objects, className, id, showPreview }: BulkLabelInputProps) => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  // Selection order (click / Ctrl+click order), not the order the objects were created in.
  const order = new Map(uiState.selectedObjectIds.map((oid, i) => [oid, i]));
  const ordered = [...objects].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const isMulti = ordered.length > 1;
  const common = ordered.every(o => o.name === ordered[0]?.name) ? (ordered[0]?.name || '') : '';

  // Local text, so a typed pattern stays visible after the labels were numbered (they then differ).
  const selectionKey = ordered.map(o => o.id).join(',');
  const [draft, setDraft] = useState(common);
  useEffect(() => { setDraft(common); }, [selectionKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Outside edits (undo, another panel) of a common label show up here.
  useEffect(() => { if (!hasNumberPattern(draft)) setDraft(common); }, [common]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPattern = isMulti && hasNumberPattern(draft);

  const applyPattern = (sequence: EditorObject[] = ordered) => {
    if (!isPattern) return;
    const names: Record<string, string> = {};
    sequence.forEach((o, i) => { names[o.id] = expandLabelPattern(draft, i); });
    dispatch({ type: 'RENAME_OBJECTS', payload: names });
  };
  const hasIdf = getRacks(docState.objects).length > 0;
  /** A "number in this order" button; needs a pattern in the field. */
  const orderButton = (icon: React.ReactNode, label: string, shortLabel: string, hint: string, testId: string, order: () => EditorObject[]) => (
    <Button
      type="button" variant="outline" size="sm"
      className={cn("gap-1 text-[10px] shrink-0", showPreview ? "h-7 w-full" : "h-6 px-1.5")}
      disabled={!isPattern}
      // Keep the field's blur from applying the selection order first.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => applyPattern(order())}
      title={isPattern ? hint : `${hint} Type a pattern first, e.g. CAM %1.`}
      data-testid={testId}
    >
      {icon}
      {showPreview ? label : shortLabel}
    </Button>
  );
  const orderButtons = isMulti && (
    <>
      {orderButton(<Waypoints className="h-3 w-3" />, 'Number by nearest neighbour', 'Chain', CHAIN_HINT, 'bulk-label-by-chain',
        () => orderByNearestChain(ordered))}
      {hasIdf && orderButton(<Route className="h-3 w-3" />, 'Number by distance to IDF', 'By IDF', DISTANCE_HINT, 'bulk-label-by-distance',
        () => orderByIdfDistance(ordered, docState.objects, docState.cableRoutes))}
    </>
  );

  const onChange = (value: string) => {
    setDraft(value);
    if (!isMulti || !hasNumberPattern(value)) {
      dispatch({ type: 'UPDATE_OBJECTS', payload: { ids: ordered.map(o => o.id), updates: { name: value } } });
    }
  };

  const preview = isPattern
    ? `${expandLabelPattern(draft, 0)} … ${expandLabelPattern(draft, ordered.length - 1)}`
    : null;

  return (
    <>
      <Input
        id={id}
        className={cn(className, isPattern && 'text-primary')}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        // Enter / Esc finish editing (leaving the field applies a pattern) and give the keys back to the plan.
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); }
        }}
        onBlur={() => applyPattern()}
        placeholder={isMulti ? 'Mixed… (CAM %1 = numbering)' : 'No label'}
        title={isMulti ? PATTERN_HINT : undefined}
        data-testid="bulk-label-input"
      />
      {!showPreview && orderButtons}
      {showPreview && isMulti && (
        <p className="text-[10px] text-muted-foreground leading-snug" data-testid="bulk-label-preview">
          {preview
            ? <>Enter → <span className="font-mono text-foreground">{preview}</span> ({ordered.length}, in selection order)</>
            : <>Tip: <span className="font-mono">CAM %1</span> numbers them 1…{ordered.length} in selection order</>}
        </p>
      )}
      {showPreview && orderButtons}
    </>
  );
};
