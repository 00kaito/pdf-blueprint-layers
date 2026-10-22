import React, {useState} from 'react';
import {useDocumentDispatch} from '@/lib/editor-context';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

/**
 * Resizes all selected objects by a percentage, each around its own centre (so nothing moves on
 * the plan). −10% / +10% apply at once; any other value with Apply / Enter. One undo step each.
 */
export const ResizeByPercent = ({ ids }: { ids: string[] }) => {
  const dispatch = useDocumentDispatch();
  const [percent, setPercent] = useState('100');

  const scale = (factor: number) => dispatch({ type: 'SCALE_OBJECTS', payload: { ids, factor } });
  const apply = () => {
    const n = parseFloat(percent);
    if (n > 0 && n !== 100) scale(n / 100);
    setPercent('100');
  };

  return (
    <div className="space-y-1.5" data-testid="resize-percent">
      <Label className="text-[10px] uppercase text-muted-foreground">
        Resize {ids.length > 1 ? `${ids.length} objects` : 'object'}
      </Label>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs shrink-0" onClick={() => scale(0.9)} data-testid="resize-minus">
          −10%
        </Button>
        <div className="relative flex-1 min-w-0">
          <Input
            inputMode="decimal"
            value={percent}
            onChange={(e) => setPercent(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
            onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
            className="h-8 text-xs pl-1 pr-5 text-center"
            data-testid="resize-input"
          />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
        </div>
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs shrink-0" onClick={() => scale(1.1)} data-testid="resize-plus">
          +10%
        </Button>
        <Button size="sm" className="h-8 px-2 text-xs shrink-0" onClick={apply} data-testid="resize-apply">
          Apply
        </Button>
      </div>
    </div>
  );
};
