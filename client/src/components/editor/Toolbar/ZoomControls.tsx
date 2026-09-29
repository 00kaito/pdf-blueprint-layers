import React from 'react';
import {ChevronDown, Maximize, ZoomIn, ZoomOut} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {useDocument, useUIDispatch} from '@/lib/editor-context';
import {CANVAS_BASE_WIDTH} from '@/core/constants';

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
/** Each +/- click zooms by this factor. */
const ZOOM_STEP = 1.25;
const PRESETS = [0.5, 1, 2, 4];
/** Padding around the page inside the canvas scroller (p-8 on both sides). */
const CANVAS_PADDING = 64;

interface ZoomControlsProps {
  scale: number;
}

const clampScale = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

export const ZoomControls = ({ scale }: ZoomControlsProps) => {
  const uiDispatch = useUIDispatch();
  const { state: docState } = useDocument();
  const setScale = (v: number) => uiDispatch({ type: 'SET_SCALE', payload: clampScale(v) });

  /** Scale at which the page fits the visible canvas area: its width only, or the whole page. */
  const fitScale = (whole: boolean) => {
    const scroller = document.querySelector<HTMLElement>('[data-canvas-scroller]');
    if (!scroller) return scale;
    const byWidth = (scroller.clientWidth - CANVAS_PADDING) / CANVAS_BASE_WIDTH;
    const byHeight = (scroller.clientHeight - CANVAS_PADDING) / docState.pdfCanvasHeight;
    return whole ? Math.min(byWidth, byHeight) : byWidth;
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(scale / ZOOM_STEP)} title="Zoom out (Ctrl + wheel)">
        <ZoomOut className="w-4 h-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 font-mono text-xs w-[4.5rem]" data-testid="zoom-level">
            {Math.round(scale * 100)}%
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {PRESETS.map(p => (
            <DropdownMenuItem key={p} onClick={() => setScale(p)} className="cursor-pointer font-mono text-xs">
              {p * 100}%
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setScale(fitScale(false))} className="cursor-pointer text-xs">Fit width</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setScale(fitScale(true))} className="cursor-pointer text-xs">Fit page</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(scale * ZOOM_STEP)} title="Zoom in (Ctrl + wheel)">
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(fitScale(true))} title="Fit page" data-testid="zoom-fit">
        <Maximize className="w-4 h-4" />
      </Button>
    </div>
  );
};
