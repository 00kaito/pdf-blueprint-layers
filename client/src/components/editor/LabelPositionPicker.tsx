import React from 'react';
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUp} from 'lucide-react';
import {Toggle} from '@/components/ui/toggle';
import {DEFAULT_LABEL_POSITION, LABEL_POSITIONS, LabelPosition} from '@/core/label-position';
import {EditorObject} from '@/lib/types';
import {cn} from '@/lib/utils';

const ICONS: Record<LabelPosition, React.ElementType> = {
  top: ArrowUp,
  left: ArrowLeft,
  bottom: ArrowDown,
  right: ArrowRight,
};

interface LabelPositionPickerProps {
  objects: EditorObject[];
  /** Receives the updates to apply — choosing a side also drops any manual (dragged) placement. */
  onChange: (updates: Pick<EditorObject, 'labelPosition' | 'labelOffset'>) => void;
  disabled?: boolean;
  className?: string;
}

/** Four toggles choosing on which side of the object its label is shown (or resetting a dragged label). */
export const LabelPositionPicker = ({ objects, onChange, disabled, className }: LabelPositionPickerProps) => {
  const positions = new Set(objects.map(o => o.labelPosition ?? DEFAULT_LABEL_POSITION));
  // With a mixed multi-selection no toggle is shown as active.
  const isCustom = objects.some(o => o.labelOffset);
  const current = !isCustom && positions.size === 1 ? Array.from(positions)[0] : null;

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      data-testid="label-position-picker"
      title={isCustom ? 'Label was dragged manually — pick a side to snap it back' : undefined}
    >
      {isCustom && <span className="text-[9px] uppercase font-bold text-primary mr-0.5">Custom</span>}
      {LABEL_POSITIONS.map(({ value, title }) => {
        const Icon = ICONS[value];
        return (
          <Toggle
            key={value}
            size="sm"
            pressed={current === value}
            onPressedChange={() => onChange({ labelPosition: value, labelOffset: undefined })}
            disabled={disabled}
            title={title}
            aria-label={title}
            className="h-6 w-6 min-w-0 p-0"
            data-testid={`label-position-${value}`}
          >
            <Icon className="w-3 h-3" />
          </Toggle>
        );
      })}
    </div>
  );
};
