import React from 'react';
import {BrickWall, ChevronDown, Video, VideoOff} from 'lucide-react';
import {useDocument, useUI} from '@/lib/editor-context';
import {COVERAGE_AREA_LAYER_NAME} from '@/lib/editor-context';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';
import {Toggle} from '@/components/ui/toggle';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';
import {useObjectCreation} from '@/hooks/useObjectCreation';
import {useToast} from '@/hooks/use-toast';
import {BlindspotShape, CoverageAreaShape} from '@/components/editor/BlindspotShape';
import {BLINDSPOT_ICON, isBlindspot, isBlindspotWall, isCamera, isCoverageArea} from '@/core/camera-coverage';
import {EditorObject} from '@/lib/types';
import {ToolGroup} from './ToolGroup';

/** The plan has something CCTV tools work with: a camera, a blindspot (box / wall) or a coverage area. */
export const hasCctvObjects = (objects: EditorObject[]) =>
  objects.some(o => isCamera(o) || isBlindspot(o) || isBlindspotWall(o) || isCoverageArea(o));

/**
 * CCTV tools (blindspot wall / box, coverage area) and the coverage visibility. Shown only on plans
 * with CCTV objects (or while a CCTV tool is on), always at the end of the tool row. TECH only gets the visibility.
 */
export const CctvTools = ({ isTech }: { isTech: boolean }) => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const { handleAddIcon } = useObjectCreation();
  const { toast } = useToast();

  if (uiState.tool !== 'wall' && uiState.tool !== 'area' && !hasCctvObjects(docState.objects)) return null;

  const toggleCoverage = () => {
    // Coverage is drawn in feet: without the measuring scale there is nothing to draw yet.
    if (!uiState.showCameraCoverage && !docState.measureCalibration) {
      toast({ title: 'Set the scale first', description: 'Camera coverage appears once the plan is calibrated (measure tool).' });
    }
    dispatch({ type: 'TOGGLE_CAMERA_COVERAGE' });
  };

  return (
    <ToolGroup label="CCTV" data-testid="toolbar-cctv">
      {!isTech && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={uiState.tool === 'wall'}
                onPressedChange={(pressed) => dispatch({ type: 'SET_TOOL', payload: pressed ? 'wall' : 'select' })}
                size="sm"
                className="h-8 w-8"
                data-testid="tool-wall"
              >
                <BrickWall className="w-4 h-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Blindspot wall — click its corners; cameras cannot see past it <kbd className="ml-1 rounded border px-1 font-mono text-[10px]">W</kbd></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="sm" className="h-8 w-8 p-0"
                onClick={() => handleAddIcon(BLINDSPOT_ICON)}
                aria-label="Camera blindspot"
                data-testid="add-blindspot"
              >
                <BlindspotShape className="w-5 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Camera blindspot — a box cameras cannot see past; resize it over a shelf or column</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={uiState.tool === 'area'}
                onPressedChange={(pressed) => dispatch({ type: 'SET_TOOL', payload: pressed ? 'area' : 'select' })}
                size="sm"
                className="h-8 w-8"
                aria-label="Coverage area"
                data-testid="tool-area"
              >
                <CoverageAreaShape className="w-5 h-3.5" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Coverage area (goes to layer "{COVERAGE_AREA_LAYER_NAME}") — click its corners, Enter / Esc closes it; the cameras picked in its properties must see it, what they miss turns red</TooltipContent>
          </Tooltip>
        </>
      )}

      <div className="flex items-center rounded-md border border-input bg-background overflow-hidden ml-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={uiState.showCameraCoverage}
              onPressedChange={toggleCoverage}
              size="sm"
              className="h-7 w-8 rounded-none border-none"
              aria-label="Show camera coverage"
              data-testid="cctv-coverage-toggle"
            >
              {uiState.showCameraCoverage ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Show camera coverage {uiState.showCameraCoverage ? '(on)' : '(off)'}</TooltipContent>
        </Tooltip>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-5 rounded-none px-0 border-l border-input hover:bg-muted" aria-label="Coverage display options" data-testid="cctv-coverage-settings">
              <ChevronDown className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60" side="bottom" align="end">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Camera coverage</h4>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="cctv-coverage-solid"
                  checked={uiState.coverageSolid}
                  onCheckedChange={() => dispatch({ type: 'TOGGLE_COVERAGE_SOLID' })}
                  className="mt-0.5"
                />
                <Label htmlFor="cctv-coverage-solid" className="text-xs font-normal cursor-pointer leading-snug">
                  One colour
                  <span className="block text-[10px] text-muted-foreground">No 15 ft ring, plain field of view</span>
                </Label>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </ToolGroup>
  );
};
