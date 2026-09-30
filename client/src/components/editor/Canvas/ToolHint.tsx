import React, {useEffect, useState} from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {cn} from '@/lib/utils';

/** How long the hint stays after the tool changes. */
const HINT_VISIBLE_MS = 4000;

/**
 * The touch layout names gestures instead of keys; stylus-only says which tools need the stylus.
 */
const hintFor = (tool: string, hasScale: boolean, touch: boolean, stylusOnly: boolean): string | null => {
  const pinch = stylusOnly ? 'fingers = pan / zoom' : '2 fingers = pan / zoom';
  const pen = stylusOnly ? 'With the stylus: ' : '';
  const tap = stylusOnly ? 'Tap with the stylus' : touch ? 'Tap' : 'Click';
  switch (tool) {
    case 'select': return touch
      ? 'Tap = select, then drag to move · double tap = clone · long press = settings · ⟳ tap = 45°'
      : 'Drag on empty space = select area · Shift = 0.5 ft steps · Ctrl = no snapping · Space + drag = pan';
    case 'draw': return touch
      ? `${pen}Draw · ${pinch}`
      : 'Draw · Shift = straight line · Esc = done';
    case 'fill': return `${tap} inside an area enclosed by lines · again on a filled area to recolour`;
    case 'calibrate': return touch
      ? `${pen}Drag a line over a known dimension, then enter its length in feet · ${pinch}`
      : 'Draw a line over a known dimension, then enter its length in feet';
    case 'measure': return !hasScale
      ? 'Set the scale with the probe (K) first'
      : touch
        ? `${pen}Drag from A to B · ${pinch} · the tape stays until ✕`
        : 'Drag from A to B · Shift = straight · the tape stays until ✕ or Esc';
    case 'pan-overlay': return touch
      ? 'Drag the overlay to align it · tap Done when finished'
      : 'Drag the overlay to align it · arrow keys nudge · Esc = done';
    case 'stamp': return `${tap} to place the next numbered object`;
    default: return null;
  }
};

/** One-line instruction for the active tool, shown briefly at the bottom of the canvas area. */
export const ToolHint = () => {
  const { state: uiState } = useUI();
  const { state: docState } = useDocument();
  const [visible, setVisible] = useState(true);
  const hint = hintFor(uiState.tool, !!docState.measureCalibration, uiState.ipadMode, uiState.stylusOnly);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), HINT_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [uiState.tool, uiState.stylusOnly]);

  if (!hint) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-4 left-1/2 z-40 -translate-x-1/2 max-w-[90%] rounded-full bg-foreground/85 px-4 py-1.5 text-xs text-background shadow-lg transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
      role="status"
      data-testid="tool-hint"
    >
      {hint}
    </div>
  );
};
