import React from 'react';
import {Eye, EyeOff, Spline} from 'lucide-react';
import {useDocument, useUI} from '@/lib/editor-context';
import {Toggle} from '@/components/ui/toggle';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';
import {ToolGroup} from './ToolGroup';

/** Cabling: the cable route tool and the routes' visibility. TECH only gets the visibility. */
export const CablingTools = ({ isTech }: { isTech: boolean }) => {
  const { dispatch } = useDocument();
  const { state: uiState } = useUI();

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
    </ToolGroup>
  );
};
