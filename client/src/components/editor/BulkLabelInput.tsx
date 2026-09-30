import React, {useEffect, useState} from 'react';
import {Input} from '@/components/ui/input';
import {useDocumentDispatch, useUI} from '@/lib/editor-context';
import {EditorObject} from '@/lib/types';
import {expandLabelPattern, hasNumberPattern} from '@/core/label-pattern';
import {cn} from '@/lib/utils';

interface BulkLabelInputProps {
  objects: EditorObject[];
  className?: string;
  id?: string;
  /** Show the "CAM 1 … CAM 5" preview under the field (the toolbar has no room for it). */
  showPreview?: boolean;
}

const PATTERN_HINT = 'With several objects selected, %1 numbers them in selection order: "CAM %1" → CAM 1, CAM 2… (%01 → 01, 02…; %10 starts at 10). Enter applies.';

/**
 * Label field for one or many objects. Plain text is applied as you type (to all selected objects);
 * a numbering pattern (`%1`) with several objects is applied on Enter / leaving the field, giving
 * each object its own number in the order they were selected.
 */
export const BulkLabelInput = ({ objects, className, id, showPreview }: BulkLabelInputProps) => {
  const dispatch = useDocumentDispatch();
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

  const applyPattern = () => {
    if (!isPattern) return;
    const names: Record<string, string> = {};
    ordered.forEach((o, i) => { names[o.id] = expandLabelPattern(draft, i); });
    dispatch({ type: 'RENAME_OBJECTS', payload: names });
  };

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
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPattern(); } }}
        onBlur={applyPattern}
        placeholder={isMulti ? 'Mixed… (CAM %1 = numbering)' : 'No label'}
        title={isMulti ? PATTERN_HINT : undefined}
        data-testid="bulk-label-input"
      />
      {showPreview && isMulti && (
        <p className="text-[10px] text-muted-foreground leading-snug" data-testid="bulk-label-preview">
          {preview
            ? <>Enter → <span className="font-mono text-foreground">{preview}</span> ({ordered.length}, in selection order)</>
            : <>Tip: <span className="font-mono">CAM %1</span> numbers them 1…{ordered.length} in selection order</>}
        </p>
      )}
    </>
  );
};
