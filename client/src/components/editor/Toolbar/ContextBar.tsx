import React from 'react';
import {Crosshair, Hand, MoveHorizontal, Ruler, Spline} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Slider} from '@/components/ui/slider';
import {Toggle} from '@/components/ui/toggle';
import {useDocument, useUI} from '@/lib/editor-context';
import {useCurrentUser} from '@/hooks/useAuth';
import {feetPerUnit, formatFeet, formatFeetInches, segmentLength} from '@/core/measure';
import {cn} from '@/lib/utils';
import {ObjectPropertyEditor} from './ObjectPropertyEditor';
import {BRUSH_SIZE_STEP, MAX_BRUSH_SIZE, MIN_BRUSH_SIZE} from './ToolSelector';

const TOOL_NAMES: Record<string, string> = {
  draw: 'Pencil',
  fill: 'Fill',
  measure: 'Measuring tape',
  calibrate: 'Scale probe',
  'pan-overlay': 'Overlay alignment',
};

/**
 * Freehand / straight-line mode as two segments, so the current mode is always lit — not just
 * "straight on" vs. an unlit button. Shared by the pencil and the measuring tools.
 */
const StrokeModeSwitch = ({ freeLabel, testId }: { freeLabel: string; testId?: string }) => {
  const { state: uiState, dispatch } = useUI();
  const setStraight = (drawStraight: boolean) => dispatch({ type: 'SET_DRAW_SETTINGS', payload: { drawStraight } });
  return (
    <div className="flex items-center rounded-md border border-input bg-background p-0.5 gap-0.5" role="radiogroup" aria-label="Line mode">
      <Toggle
        pressed={!uiState.drawStraight}
        onPressedChange={() => setStraight(false)}
        size="sm"
        className="h-6 min-w-0 px-2 gap-1 text-xs"
        title={freeLabel}
        role="radio"
        aria-checked={!uiState.drawStraight}
      >
        <Spline className="w-3.5 h-3.5" />
        {freeLabel}
      </Toggle>
      <Toggle
        pressed={uiState.drawStraight}
        onPressedChange={() => setStraight(true)}
        size="sm"
        className="h-6 min-w-0 px-2 gap-1 text-xs"
        title="Straight horizontal / vertical lines (same as holding Shift)"
        role="radio"
        aria-checked={uiState.drawStraight}
        data-testid={testId}
      >
        <MoveHorizontal className="w-3.5 h-3.5" />
        Straight
      </Toggle>
    </div>
  );
};

/**
 * Second toolbar row with the options of whatever is active: the selected object, else the current
 * tool. Keeps the main row fixed (it never grows or jumps), and hides itself when there is nothing to show.
 */
export const ContextBar = () => {
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const calibration = docState.measureCalibration;
  const selectedObjects = docState.objects.filter(o => uiState.selectedObjectIds.includes(o.id));

  let content: React.ReactNode = null;
  if (isTech) {
    content = null;
  } else if (selectedObjects.length > 0) {
    content = (
      <ObjectPropertyEditor
        selectedObjects={selectedObjects}
        selectedObjectIds={uiState.selectedObjectIds}
        layers={docState.layers}
        isTech={isTech}
      />
    );
  } else if (uiState.tool === 'draw') {
    content = (
        <div className="flex items-center gap-2" data-testid="draw-inline-settings">
          <input
            type="color"
            value={uiState.drawColor}
            onChange={(e) => dispatch({ type: 'SET_DRAW_SETTINGS', payload: { drawColor: e.target.value } })}
            className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
            title="Brush colour"
          />
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Size</span>
          <Slider
            value={[uiState.drawStrokeWidth]}
            min={MIN_BRUSH_SIZE}
            max={MAX_BRUSH_SIZE}
            step={BRUSH_SIZE_STEP}
            onValueChange={([v]) => dispatch({ type: 'SET_DRAW_SETTINGS', payload: { drawStrokeWidth: v } })}
            className="w-24"
            data-testid="draw-size-inline"
          />
          <StrokeModeSwitch freeLabel="Freehand" testId="draw-straight" />
          <span className="w-6 flex items-center justify-center" title={`${uiState.drawStrokeWidth}`}>
            <span
              className="rounded-full"
              style={{
                backgroundColor: uiState.drawColor,
                width: Math.max(2, Math.min(20, uiState.drawStrokeWidth * 1.5)),
                height: Math.max(2, Math.min(20, uiState.drawStrokeWidth * 1.5)),
              }}
            />
          </span>
        </div>
    );
  } else if (uiState.tool === 'fill') {
    content = (
        <div className="flex items-center gap-2" data-testid="fill-inline-settings">
          <input
            type="color"
            value={uiState.fillColor}
            onChange={(e) => dispatch({ type: 'SET_FILL_SETTINGS', payload: { fillColor: e.target.value } })}
            className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
            title="Fill colour"
          />
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Opacity</span>
          <Slider
            value={[uiState.fillOpacity]}
            min={0.05}
            max={1}
            step={0.05}
            onValueChange={([v]) => dispatch({ type: 'SET_FILL_SETTINGS', payload: { fillOpacity: v } })}
            className="w-24"
            data-testid="fill-opacity-inline"
          />
          <span className="text-[10px] font-mono w-8 text-right">{Math.round(uiState.fillOpacity * 100)}%</span>
        </div>
    );
  } else if (uiState.tool === 'measure' || uiState.tool === 'calibrate') {
    content = (
        <div className="flex items-center gap-2" data-testid="measure-inline-settings">
          {calibration ? (
            <span className="text-muted-foreground">
              Scale ref: <span className="font-mono font-medium text-foreground">{formatFeet(calibration.feet)}</span>
            </span>
          ) : (
            <span className="text-amber-600 font-medium">
              {uiState.tool === 'calibrate' ? 'Draw a line over a known dimension' : 'No scale set'}
            </span>
          )}
          <StrokeModeSwitch freeLabel="Any angle" />
          <Toggle
            pressed={uiState.tool === 'calibrate'}
            // Leaving the probe goes back to the tape. Without a scale there is nothing to measure with
            // (picking the tape starts the probe), so the probe stays on until a scale is set.
            onPressedChange={(p) => {
              if (p) dispatch({ type: 'SET_TOOL', payload: 'calibrate' });
              else if (calibration) dispatch({ type: 'SET_TOOL', payload: 'measure' });
            }}
            size="sm"
            className="h-6 min-w-0 px-2 gap-1 text-xs"
            title="Scale probe: draw a line over a known dimension and enter its length in feet (K)"
            data-testid="tool-calibrate"
          >
            <Crosshair className="w-3.5 h-3.5" />
            {uiState.tool === 'calibrate' ? 'Probing…' : calibration ? 'Re-probe scale' : 'Probe scale'}
          </Toggle>
          {uiState.measureTape && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => dispatch({ type: 'SET_MEASURE_TAPE', payload: null })}
              title="Remove the measuring tape from the blueprint (Esc)"
              data-testid="measure-clear-tape"
            >
              Clear tape
            </Button>
          )}
          {calibration && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => {
                // The scale is saved with the project, so removing it is confirmed (re-probing replaces it anyway).
                if (window.confirm('Remove the measuring scale saved with this project? You will have to probe it again to measure.')) {
                  dispatch({ type: 'SET_MEASURE_CALIBRATION', payload: null });
                }
              }}
              title="Remove the measuring scale saved with this project"
              data-testid="measure-clear-scale"
            >
              Clear scale
            </Button>
          )}
        </div>
    );
  } else if (uiState.tool === 'pan-overlay') {
    content = (
      <div className="flex items-center gap-2 text-xs">
        <Hand className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Drag the overlay on the blueprint · arrow keys nudge · Shift = fine</span>
        <Button size="sm" className="h-6 px-3 text-xs" onClick={() => dispatch({ type: 'SET_TOOL', payload: 'select' })}>
          Done
        </Button>
      </div>
    );
  } else if (uiState.measureTape) {
    // The tape stays on the blueprint after measuring — show its length and a way to remove it.
    const ft = feetPerUnit(calibration);
    const tape = uiState.measureTape;
    content = (
      <div className="flex items-center gap-2 text-xs">
        <Ruler className="w-3.5 h-3.5 text-red-600" />
        <span className="text-muted-foreground">
          Tape: <span className="font-mono font-medium text-foreground">
            {ft ? formatFeetInches(segmentLength(tape.a, tape.b) * ft) : '—'}
          </span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => dispatch({ type: 'SET_MEASURE_TAPE', payload: null })}
          title="Remove the measuring tape (Esc)"
        >
          Clear tape
        </Button>
      </div>
    );
  }

  if (!content) return null;
  const toolName = selectedObjects.length > 0
    ? (selectedObjects.length === 1 ? 'Selected' : `${selectedObjects.length} selected`)
    : TOOL_NAMES[uiState.tool];

  return (
    <div
      className={cn(
        "h-11 border-b border-border bg-muted/40 flex items-center gap-3 px-4 shrink-0 overflow-x-auto [scrollbar-width:none]",
        uiState.ipadMode && "ipad-mode h-14"
      )}
      data-testid="context-bar"
    >
      {toolName && (
        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground whitespace-nowrap">{toolName}</span>
      )}
      {content}
    </div>
  );
};
