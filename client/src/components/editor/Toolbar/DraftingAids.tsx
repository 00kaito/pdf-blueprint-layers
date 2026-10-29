import React from 'react';
import {Hash, Magnet, Settings2} from 'lucide-react';
import {useDocument, useUI} from '@/lib/editor-context';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Toggle} from '@/components/ui/toggle';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';

/**
 * Drafting aids: settings that stay on while working with any tool (snap, auto-numbering) — not tools
 * themselves, so they sit apart from the tool row, next to undo / zoom.
 */
export const DraftingAids = () => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1" data-testid="drafting-aids">
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={uiState.snapEnabled}
              onPressedChange={(p) => dispatch({ type: 'SET_SNAP_ENABLED', payload: p })}
              size="sm"
              className="h-8 w-8"
              data-testid="snap-toggle"
            >
              <Magnet className="w-4 h-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>
            Snap to objects {uiState.snapEnabled ? 'on' : 'off'} — aligns edges and centres while dragging (hold Ctrl or Alt to drop it exactly where you want, Shift to move in 0.5 ft steps)
          </TooltipContent>
        </Tooltip>

        <div className="flex items-center rounded-md border border-input bg-background overflow-hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle pressed={docState.autoNumbering.enabled}
                onPressedChange={(p) => {
                   dispatch({ type: 'SET_AUTO_NUMBERING', payload: { enabled: p } });
                   if (!p && uiState.tool === 'stamp') dispatch({ type: 'SET_TOOL', payload: 'select' });
                }} size="sm" className="h-8 w-8 rounded-none border-none">
                <Hash className="w-4 h-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Auto-Numbering {docState.autoNumbering.enabled ? 'on' : 'off'}</TooltipContent>
          </Tooltip>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-6 rounded-none px-0 border-l border-input hover:bg-muted">
                 <Settings2 className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" side="bottom" align="end">
              <div className="space-y-4">
                 <h4 className="font-medium leading-none">Auto-Numbering Settings</h4>
                 <div className="grid gap-2">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label>Prefix</Label>
                      <Input value={docState.autoNumbering.prefix} onChange={(e) => dispatch({ type: 'SET_AUTO_NUMBERING', payload: { prefix: e.target.value } })} className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label>Start #</Label>
                      <Input type="number" value={docState.autoNumbering.counter} onChange={(e) => dispatch({ type: 'SET_AUTO_NUMBERING', payload: { counter: parseInt(e.target.value) || 1 } })} className="col-span-2 h-8" />
                    </div>
                 </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </TooltipProvider>
  );
};
