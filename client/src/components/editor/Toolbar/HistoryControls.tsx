import React from 'react';
import {History, Redo2, Undo2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {useHistory} from '@/lib/editor-context';
import {cn} from '@/lib/utils';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const HistoryControls = () => {
  const { past, future, canUndo, canRedo, undo, redo, jumpTo } = useHistory();

  // Rows newest first: redoable (undone) entries on top, dimmed, then applied ones.
  const undoneRows = [...future].reverse().map((entry, i) => ({
    entry,
    applied: false,
    // Jumping here re-applies everything up to and including this entry.
    target: past.length + future.length - i,
  }));
  const appliedRows = [...past].reverse().map((entry, i) => ({
    entry,
    applied: true,
    target: past.length - i,
  }));
  const rows = [...undoneRows, ...appliedRows];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={undo} disabled={!canUndo}>
              <Undo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {canUndo ? `Undo: ${past[past.length - 1].label}` : 'Nothing to undo'} ({mod}+Z)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={redo} disabled={!canRedo}>
              <Redo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {canRedo ? `Redo: ${future[0].label}` : 'Nothing to redo'} ({mod}+Shift+Z / {mod}+Y)
          </TooltipContent>
        </Tooltip>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={rows.length === 0}>
                  <History className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Change history</TooltipContent>
          </Tooltip>
          <PopoverContent align="start" className="w-80 p-0">
            <div className="px-3 py-2 border-b border-border text-sm font-medium">Change history</div>
            <div className="max-h-80 overflow-y-auto">
              <ul className="py-1">
                {rows.map(({ entry, applied, target }, i) => {
                  const isCurrent = applied && i === undoneRows.length;
                  return (
                    <li key={`${entry.id}-${applied}`}>
                      <button
                        type="button"
                        onClick={() => jumpTo(target)}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted',
                          !applied && 'text-muted-foreground line-through decoration-muted-foreground/50',
                          isCurrent && 'bg-primary/10 font-medium'
                        )}
                        title={applied ? 'Restore state after this change' : 'Redo up to this change'}
                      >
                        <span className="truncate">{entry.label}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                          {formatTime(entry.timestamp)}
                        </span>
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    onClick={() => jumpTo(0)}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted italic',
                      past.length === 0 && 'bg-primary/10 font-medium not-italic text-foreground'
                    )}
                  >
                    Initial state
                  </button>
                </li>
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
};
