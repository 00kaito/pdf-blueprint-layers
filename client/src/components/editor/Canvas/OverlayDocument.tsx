import React, {useEffect, useRef, useState} from 'react';
import {Document, Page} from 'react-pdf';
import {useDocument, useUI} from '@/lib/editor-context';
import {CANVAS_BASE_WIDTH} from '@/core/constants';
import {cn} from '@/lib/utils';

/** Pointer movement multiplier while Shift is held during a hand drag — for fine alignment. */
const PRECISE_DRAG_FACTOR = 0.2;
/** Arrow-key nudge in unscaled canvas units (Shift = large step). */
const KEY_NUDGE_STEP = 1;
const KEY_NUDGE_STEP_LARGE = 10;

const round1 = (v: number) => Math.round(v * 10) / 10;

export const OverlayDocument = () => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();

  const isPanning = uiState.tool === 'pan-overlay';
  const storedOffset = docState.overlayOffset ?? { x: 0, y: 0 };

  // Live offset while dragging; committed to the document (and history) on release.
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ pointerId: number; lastX: number; lastY: number; offset: { x: number; y: number } } | null>(null);

  useEffect(() => {
    if (!isPanning) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'SET_TOOL', payload: 'select' });
        return;
      }
      const step = e.shiftKey ? KEY_NUDGE_STEP_LARGE : KEY_NUDGE_STEP;
      const delta: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const d = delta[e.key];
      if (!d) return;
      e.preventDefault();
      dispatch({
        type: 'SET_OVERLAY_OFFSET',
        payload: { x: storedOffset.x + d[0], y: storedOffset.y + d[1] },
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanning, storedOffset.x, storedOffset.y, dispatch]);

  if (!docState.overlayPdfFile) return null;

  const offset = dragOffset ?? storedOffset;
  // Offset is stored in unscaled canvas units, so it must follow the current zoom level.
  const translateX = offset.x * uiState.scale;
  const translateY = offset.y * uiState.scale;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY, offset: storedOffset };
    setDragOffset(storedOffset);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    // Accumulate per-move deltas so toggling Shift mid-drag doesn't make the overlay jump.
    const factor = e.shiftKey ? PRECISE_DRAG_FACTOR : 1;
    const next = {
      x: drag.offset.x + ((e.clientX - drag.lastX) / uiState.scale) * factor,
      y: drag.offset.y + ((e.clientY - drag.lastY) / uiState.scale) * factor,
    };
    dragRef.current = { ...drag, lastX: e.clientX, lastY: e.clientY, offset: next };
    setDragOffset(next);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragOffset(null);
    if (drag.offset.x !== storedOffset.x || drag.offset.y !== storedOffset.y) {
      dispatch({ type: 'SET_OVERLAY_OFFSET', payload: drag.offset });
    }
  };

  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: docState.overlayOpacity,
          zIndex: 5,
          transform: `translate(${translateX}px, ${translateY}px)`,
        }}
      >
        <Document file={docState.overlayPdfFile} className="bg-transparent">
          <Page
            pageNumber={uiState.currentPage}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            width={CANVAS_BASE_WIDTH}
            scale={uiState.scale}
            className="bg-transparent"
          />
        </Document>
      </div>

      {isPanning && (
        // Sits above objects so the drag always grabs the overlay, never an object.
        <div
          className={cn(
            'absolute inset-0 ring-2 ring-inset ring-primary/60',
            dragOffset ? 'cursor-grabbing' : 'cursor-grab'
          )}
          style={{ zIndex: 40, touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onMouseDown={(e) => e.stopPropagation()}
          data-testid="overlay-pan-surface"
        >
          <div className="sticky top-2 left-2 inline-flex m-2 items-center gap-2 rounded-md bg-background/90 border border-border px-2 py-1 text-[10px] font-mono shadow-sm pointer-events-none">
            <span className="font-sans font-medium text-primary">Overlay</span>
            <span>X {round1(offset.x)}</span>
            <span>Y {round1(offset.y)}</span>
            <span className="font-sans text-muted-foreground">Shift = fine · arrows = nudge · Esc = done</span>
          </div>
        </div>
      )}
    </>
  );
};
