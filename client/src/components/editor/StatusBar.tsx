import React from 'react';
import {AlertTriangle, Layers, Lock, Ruler} from 'lucide-react';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Button} from '@/components/ui/button';
import {useDocument, useUI} from '@/lib/editor-context';
import {formatFeet} from '@/core/measure';
import {cn} from '@/lib/utils';
import {DraftingAids} from './Toolbar/DraftingAids';

/** What the plan's scale is needed for — shown where it is missing. */
const NEEDS_SCALE = 'Needed for the measuring tape, path lengths, jumper and cable lengths, and camera coverage.';

/**
 * Bottom bar of the editor (desktop / tablet): the state that decides what the next action does,
 * always visible — the layer new objects go to, the plan's scale, snapping and auto-numbering, and
 * whether the plan is saved. Before, these were hidden in a collapsed panel, a tool's options or a
 * coloured dot.
 */
export const StatusBar = ({ isSaving, isTech }: { isSaving?: boolean; isTech: boolean }) => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const calibration = docState.measureCalibration;
  const numbering = docState.autoNumbering;
  // Top layer first, as in the layer panel.
  const layers = [...docState.layers].reverse();
  const activeLayer = docState.layers.find(l => l.id === uiState.activeLayerId);
  const touch = uiState.ipadMode;

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-border bg-card px-3 text-xs shrink-0 overflow-x-auto [scrollbar-width:none]",
        touch ? "h-12" : "h-10"
      )}
      data-testid="status-bar"
    >
      {!isTech && (
        <div className="flex items-center gap-1.5 shrink-0" title="New objects are added to this layer">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Layer</span>
          <Select value={uiState.activeLayerId ?? undefined} onValueChange={(id) => dispatch({ type: 'SELECT_LAYER', payload: id })}>
            <SelectTrigger className={cn("w-[10rem] text-xs", touch ? "h-9" : "h-7")} data-testid="status-layer">
              <SelectValue placeholder="No layer" />
            </SelectTrigger>
            <SelectContent>
              {layers.map(l => (
                <SelectItem key={l.id} value={l.id} className="text-xs">
                  <span className={cn(!l.visible && "text-muted-foreground")}>{l.name}{!l.visible && ' (hidden)'}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeLayer && !activeLayer.visible && (
            <span className="text-amber-600" title="This layer is hidden: what you add to it will not show">hidden</span>
          )}
          {activeLayer?.locked && <Lock className="h-3.5 w-3.5 text-amber-600" aria-label="Layer locked" />}
        </div>
      )}

      {/* Scale: what it is, or that it is missing and how to set it. */}
      <div className="flex items-center gap-1.5 shrink-0" data-testid="status-scale">
        {calibration ? (
          <>
            <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Scale</span>
            <span className="font-medium" title="Set with the scale probe; saved with the project">
              ✓ set <span className="font-normal text-muted-foreground">(from a {formatFeet(calibration.feet)} line)</span>
            </span>
            {!isTech && (
              <Button
                variant="ghost" size="sm" className={cn("px-2 text-xs", touch ? "h-9" : "h-7")}
                onClick={() => dispatch({ type: 'SET_TOOL', payload: 'calibrate' })}
                title="Draw a line over a known dimension again (K)"
              >
                Re-probe
              </Button>
            )}
          </>
        ) : (
          <>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span className="font-medium text-amber-700" title={NEEDS_SCALE}>No scale</span>
            {isTech ? (
              <span className="text-muted-foreground" title={NEEDS_SCALE}>— a PM sets it</span>
            ) : (
              <Button
                variant="outline" size="sm" className={cn("px-2 text-xs border-amber-300", touch ? "h-9" : "h-7")}
                onClick={() => dispatch({ type: 'SET_TOOL', payload: 'calibrate' })}
                title={`Draw a line over a known dimension and enter its length (K). ${NEEDS_SCALE}`}
                data-testid="status-set-scale"
              >
                Set scale
              </Button>
            )}
          </>
        )}
      </div>

      {!isTech && (
        <div className="flex items-center gap-1.5 shrink-0">
          <DraftingAids />
          {numbering.enabled && (
            <span className="font-mono text-muted-foreground" title="Auto-numbering: the next number" data-testid="status-next-number">
              next {numbering.prefix}{String(numbering.counter).padStart(2, '0')}
            </span>
          )}
        </div>
      )}

      {/* Saving: in words, not just a coloured dot. */}
      {isSaving !== undefined && docState.projectId && !isTech && (
        <span
          className={cn("ml-auto shrink-0 flex items-center gap-1.5", isSaving ? "text-amber-700" : "text-muted-foreground")}
          data-testid="save-status"
          aria-live="polite"
        >
          <span className={cn("h-2 w-2 rounded-full", isSaving ? "border-2 border-amber-500 border-t-transparent animate-spin" : "bg-muted-foreground/50")} />
          {isSaving ? 'Saving…' : 'All changes saved'}
        </span>
      )}
    </div>
  );
};
