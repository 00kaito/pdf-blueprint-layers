import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUp, FileText, Hand, Plus, RotateCcw, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Slider} from '@/components/ui/slider';
import {Label} from '@/components/ui/label';
import {useCurrentUser} from '@/hooks/useAuth';

/** Step (unscaled canvas units) applied by the overlay nudge buttons. */
const OVERLAY_NUDGE_STEP = 1;

/**
 * Overlay blueprint: add / remove the second PDF, its transparency and manual alignment.
 * Used once or twice per project, so it lives in a dialog opened from the main menu.
 */
export const OverlaySettings = ({ onStartDrag }: {
  /** Called when the hand tool is switched on — the dialog should close so the overlay can be dragged. */
  onStartDrag?: () => void;
}) => {
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const state = { ...docState, ...uiState };

  const overlayOffset = state.overlayOffset ?? { x: 0, y: 0 };
  const setOverlayOffset = (x: number, y: number) => {
    dispatch({
      type: 'SET_OVERLAY_OFFSET',
      payload: { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 }
    });
  };
  const nudgeOverlay = (dx: number, dy: number) =>
    setOverlayOffset(overlayOffset.x + dx, overlayOffset.y + dy);

  return (
    <div className="space-y-3">
      {!state.overlayPdfFile ? (
        <div className="relative">
          {!isTech && (
            <>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) dispatch({ type: 'SET_OVERLAY_PDF', payload: file });
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" size="sm" className="w-full border-dashed">
                <Plus className="w-3 h-3 mr-2" />
                Add Overlay PDF
              </Button>
            </>
          )}
          {isTech && (
            <div className="text-xs text-muted-foreground italic text-center py-2 border border-dashed rounded">
              No overlay blueprint
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-background p-2 rounded border border-border">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs truncate font-medium">{state.overlayPdfFile.name}</span>
            </div>
            {!isTech && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 hover:text-destructive"
                onClick={() => dispatch({ type: 'SET_OVERLAY_PDF', payload: null })}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium uppercase">Transparency</span>
              <span className="text-[10px] font-mono bg-muted px-1 rounded">{Math.round(state.overlayOpacity * 100)}%</span>
            </div>
            <Slider
              value={[state.overlayOpacity]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={([val]) => dispatch({ type: 'SET_OVERLAY_OPACITY', payload: val })}
              className="py-2"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium uppercase">Alignment</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-[10px]"
                onClick={() => setOverlayOffset(0, 0)}
                title="Reset overlay alignment"
                data-testid="overlay-offset-reset"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="overlay-offset-x" className="text-[10px] text-muted-foreground">X</Label>
                <Input
                  id="overlay-offset-x"
                  type="number"
                  value={overlayOffset.x}
                  onChange={(e) => setOverlayOffset(Number(e.target.value), overlayOffset.y)}
                  className="h-6 w-16 text-[10px] px-1"
                  data-testid="overlay-offset-x"
                />
              </div>
              <div className="flex items-center gap-1">
                <Label htmlFor="overlay-offset-y" className="text-[10px] text-muted-foreground">Y</Label>
                <Input
                  id="overlay-offset-y"
                  type="number"
                  value={overlayOffset.y}
                  onChange={(e) => setOverlayOffset(overlayOffset.x, Number(e.target.value))}
                  className="h-6 w-16 text-[10px] px-1"
                  data-testid="overlay-offset-y"
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isTech && (
                <Button
                  variant={uiState.tool === 'pan-overlay' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 px-2 text-[10px] mr-1"
                  title="Drag the overlay on the canvas to align it (Esc to finish)"
                  onClick={() => {
                    const start = uiState.tool !== 'pan-overlay';
                    dispatch({ type: 'SET_TOOL', payload: start ? 'pan-overlay' : 'select' });
                    if (start) onStartDrag?.();
                  }}
                  data-testid="overlay-pan-toggle"
                >
                  <Hand className="w-3 h-3 mr-1" />
                  {uiState.tool === 'pan-overlay' ? 'Done' : 'Drag'}
                </Button>
              )}
              <Button variant="outline" size="icon" className="h-6 w-6" title="Nudge left" onClick={() => nudgeOverlay(-OVERLAY_NUDGE_STEP, 0)}>
                <ArrowLeft className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-6 w-6" title="Nudge right" onClick={() => nudgeOverlay(OVERLAY_NUDGE_STEP, 0)}>
                <ArrowRight className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-6 w-6" title="Nudge up" onClick={() => nudgeOverlay(0, -OVERLAY_NUDGE_STEP)}>
                <ArrowUp className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-6 w-6" title="Nudge down" onClick={() => nudgeOverlay(0, OVERLAY_NUDGE_STEP)}>
                <ArrowDown className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
