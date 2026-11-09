import React from 'react';
import {RulerDimensionLine} from 'lucide-react';
import {useDocument, useUI} from '@/lib/editor-context';
import {Toggle} from '@/components/ui/toggle';
import {useToast} from '@/hooks/use-toast';
import {cn} from '@/lib/utils';

/** Turns the path measure on / off, with a tip (gestures on touch, or that there is no scale yet). */
export const usePathMeasureToggle = (touch = false) => {
  const { dispatch } = useUI();
  const { state: docState } = useDocument();
  const { toast } = useToast();
  return (pressed: boolean) => {
    dispatch({ type: 'SET_TOOL', payload: pressed ? 'path-measure' : 'select' });
    if (!pressed) return;
    if (!docState.measureCalibration) {
      toast({ title: 'No scale set', description: 'Points can be placed, but lengths show once a PM sets the scale.' });
    } else if (touch) {
      toast({ title: 'Path measure', description: 'Tap = next point · hold your finger = remove the measurement · drag = pan.' });
    }
  };
};

/**
 * Path measure button on its own: the phone, and technicians (who have no measuring tape). Everyone
 * else finds it in the measuring tape's menu. `touch`: the bigger button, with a gesture tip.
 */
export const PathMeasureButton = ({ touch = false, className }: { touch?: boolean; className?: string }) => {
  const { state: uiState } = useUI();
  const active = uiState.tool === 'path-measure';
  const toggle = usePathMeasureToggle(touch);

  return (
    <Toggle
      pressed={active}
      onPressedChange={toggle}
      size="sm"
      className={cn(touch ? "h-10 w-10 shrink-0" : "h-8 w-8", active && "bg-violet-100 text-violet-700 data-[state=on]:bg-violet-100 data-[state=on]:text-violet-700", className)}
      title="Path measure: click point after point — each segment and the total length (Backspace = undo point, Esc = remove)"
      aria-label="Path measure"
      data-testid="tool-path-measure"
    >
      <RulerDimensionLine className={touch ? "w-5 h-5" : "w-4 h-4"} />
    </Toggle>
  );
};
