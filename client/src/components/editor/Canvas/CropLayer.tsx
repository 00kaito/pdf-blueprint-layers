import React, {useEffect, useRef, useState} from 'react';
import {Check, Maximize} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import type {ExportCrop} from '@/lib/types';
import {type CropRect, fitCropRect, moveCropRect, PAPER_SIZES, paperAspect, resizeCropRect} from '@/core/paper';
import {PaperPicker} from '../ExportPdfDialog';

type Corner = 'nw' | 'ne' | 'sw' | 'se';
type Drag = { kind: 'move' | Corner; startX: number; startY: number; start: CropRect };

const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];

interface CropLayerProps {
  crop: ExportCrop;
  scale: number;
  /** Page size in unscaled canvas units. */
  pageW: number;
  pageH: number;
  touchLayout: boolean;
  onChange: (crop: ExportCrop) => void;
  onDone: () => void;
}

/**
 * Crop frame of the PDF export: drag it to move, drag a corner to resize (the paper's aspect stays).
 * Covers the page so no other tool reacts meanwhile; the area outside the frame is dimmed.
 */
export const CropLayer = ({ crop, scale, pageW, pageH, touchLayout, onChange, onDone }: CropLayerProps) => {
  const [draft, setDraft] = useState<CropRect | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const rect = draft ?? crop.rect;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // An open paper list closes on its own Esc.
      if ((e.target as Element | null)?.closest?.('[role="listbox"], [role="option"]')) return;
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onDone(); }
    };
    // Capture: the canvas' own Esc handling must not run as well.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onDone]);

  const startDrag = (kind: Drag['kind']) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { kind, startX: e.clientX, startY: e.clientY, start: crop.rect };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / scale;
    const dy = (e.clientY - drag.startY) / scale;
    setDraft(drag.kind === 'move'
      ? moveCropRect(drag.start, dx, dy, pageW, pageH)
      : resizeCropRect(drag.start, drag.kind, dx, dy, pageW, pageH));
  };
  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (draft) onChange({ ...crop, rect: draft });
    setDraft(null);
  };

  const handle = touchLayout ? 28 : 14;
  const { label } = PAPER_SIZES[crop.paper];

  return (
    <>
      <div
        className="absolute inset-0"
        style={{ zIndex: 70 }}
        data-no-marquee
        // The plan's tools must not react to anything inside the crop step.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute border-2 border-primary cursor-move"
          style={{
            left: rect.x * scale, top: rect.y * scale, width: rect.width * scale, height: rect.height * scale,
            boxShadow: '0 0 0 100000px rgba(15, 23, 42, 0.45)',
            touchAction: 'none',
          }}
          onPointerDown={startDrag('move')}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          data-testid="crop-frame"
        >
          <span className="pointer-events-none absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
            {label} · {crop.orientation}
          </span>
          {CORNERS.map(corner => (
            <div
              key={corner}
              className={cn(
                "absolute rounded-sm border-2 border-primary bg-white",
                corner === 'nw' || corner === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize',
              )}
              style={{
                width: handle, height: handle, touchAction: 'none',
                left: corner.endsWith('w') ? -handle / 2 : undefined,
                right: corner.endsWith('e') ? -handle / 2 : undefined,
                top: corner.startsWith('n') ? -handle / 2 : undefined,
                bottom: corner.startsWith('s') ? -handle / 2 : undefined,
              }}
              onPointerDown={startDrag(corner)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              data-testid={`crop-handle-${corner}`}
            />
          ))}
        </div>
      </div>

      <div
        className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-xl"
        data-testid="crop-bar"
      >
        <PaperPicker crop={crop} pageW={pageW} pageH={pageH} onChange={c => c && onChange(c)} allowWholePage={false} />
        <Button
          variant="outline" size="sm" className="gap-1.5"
          onClick={() => onChange({ ...crop, rect: fitCropRect(paperAspect(crop.paper, crop.orientation), pageW, pageH) })}
          title="Largest frame that fits the page"
        >
          <Maximize className="h-4 w-4" /> Fit page
        </Button>
        <Button size="sm" className="gap-1.5" onClick={onDone} data-testid="crop-done">
          <Check className="h-4 w-4" /> Done
        </Button>
      </div>
    </>
  );
};
