import React from 'react';
import {Cable, ChevronDown, Eye, EyeOff, Spline} from 'lucide-react';
import {useDocument, useUI} from '@/lib/editor-context';
import {Toggle} from '@/components/ui/toggle';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {JUMPER_TYPES} from '@/core/jumpers';
import type {JumperType} from '@/lib/types';
import {cn} from '@/lib/utils';
import {ToolGroup} from './ToolGroup';

/**
 * Cabling: the cable route and jumper tools, and what is shown — routes, and every jumper (with a
 * type filter; the selected object's jumpers are always shown). TECH only gets the visibility.
 */
export const CablingTools = ({ isTech }: { isTech: boolean }) => {
  const { dispatch } = useDocument();
  const { state: uiState } = useUI();
  const filter = uiState.jumperFilter;
  const toggleType = (t: JumperType) =>
    dispatch({ type: 'SET_JUMPER_FILTER', payload: filter.includes(t) ? filter.filter(x => x !== t) : [...filter, t] });

  return (
    <ToolGroup label="Cables" data-testid="toolbar-cables">
      {!isTech && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={uiState.tool === 'route'}
              onPressedChange={(pressed) => dispatch({ type: 'SET_TOOL', payload: pressed ? 'route' : 'select' })}
              size="sm"
              className="h-8 w-8"
              data-testid="tool-route"
            >
              <Spline className="w-4 h-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Cable route — control points the cables follow to the rack <kbd className="ml-1 rounded border px-1 font-mono text-[10px]">R</kbd></TooltipContent>
        </Tooltip>
      )}
      {!isTech && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={uiState.tool === 'jumper'}
              onPressedChange={(pressed) => dispatch({ type: 'SET_TOOL', payload: pressed ? 'jumper' : 'select' })}
              size="sm"
              className="h-8 w-8"
              data-testid="tool-jumper"
            >
              <Cable className="w-4 h-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Jumper — a cable between two objects (HDMI, USB-C, Cat6…), not to the IDF <kbd className="ml-1 rounded border px-1 font-mono text-[10px]">J</kbd></TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            pressed={uiState.showCableRoutes}
            onPressedChange={() => dispatch({ type: 'TOGGLE_CABLE_ROUTES' })}
            size="sm"
            className="h-8 w-8"
            aria-label="Show cable routes"
            data-testid="cables-routes-toggle"
          >
            {uiState.showCableRoutes ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>Show cable routes {uiState.showCableRoutes ? '(on)' : '(off)'}</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex h-8 items-center gap-0.5 rounded-md px-1.5 text-xs font-medium hover:bg-muted',
                  uiState.showJumpers && 'bg-accent text-accent-foreground',
                )}
                aria-label="Show jumpers"
                data-testid="jumpers-toggle"
              >
                <Cable className="w-4 h-4" />
                {uiState.showJumpers && filter.length > 0 && <span className="text-[10px]">{filter.length}</span>}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Jumpers on the plan — the selected object's are always shown</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start">
          <DropdownMenuCheckboxItem
            checked={uiState.showJumpers}
            onCheckedChange={() => dispatch({ type: 'TOGGLE_JUMPERS' })}
            onSelect={(e) => e.preventDefault()}
            data-testid="jumpers-show-all"
          >
            Show all jumpers
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Types {filter.length ? '' : '(all)'}</DropdownMenuLabel>
          {JUMPER_TYPES.map(t => (
            <DropdownMenuCheckboxItem
              key={t.id}
              checked={filter.includes(t.id)}
              onCheckedChange={() => toggleType(t.id)}
              onSelect={(e) => e.preventDefault()}
              disabled={!uiState.showJumpers}
            >
              <span className="mr-2 inline-block h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: t.color }} />
              {t.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </ToolGroup>
  );
};
