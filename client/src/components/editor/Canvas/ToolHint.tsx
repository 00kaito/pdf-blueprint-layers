import React, {useEffect, useState} from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {cn} from '@/lib/utils';
import {hasSeenPen} from '@/core/pointer-input';

/** How long the hint stays after the tool changes. */
const HINT_VISIBLE_MS = 4000;

/** In iPad mode the hints name gestures instead of keys. */
const hintFor = (tool: string, hasScale: boolean, ipadMode: boolean): string | null => {
  const pinch = '2 fingers = pan / zoom';
  switch (tool) {
    case 'select': return ipadMode
      ? 'Drag objects · tap to select · long-press = details'
      : 'Drag objects · Shift = 0.5 ft steps · Alt = no snapping · Space + drag = pan';
    case 'draw': return ipadMode
      ? `${hasSeenPen() ? 'Draw with the pencil' : 'Draw with a finger or the pencil'} · ${pinch}`
      : 'Draw · Shift = straight line · Esc = done';
    case 'fill': return `${ipadMode ? 'Tap' : 'Click'} inside an area enclosed by lines · ${ipadMode ? 'tap' : 'click'} a filled area again to recolour`;
    case 'calibrate': return ipadMode
      ? `Drag a line over a known dimension, then enter its length in feet · ${pinch}`
      : 'Draw a line over a known dimension, then enter its length in feet';
    case 'measure': return !hasScale
      ? 'Set the scale with the probe (K) first'
      : ipadMode
        ? `Drag from A to B · ${pinch} · the tape stays until ✕`
        : 'Drag from A to B · Shift = straight · the tape stays until ✕ or Esc';
    case 'pan-overlay': return ipadMode
      ? 'Drag the overlay to align it · tap Done when finished'
      : 'Drag the overlay to align it · arrow keys nudge · Esc = done';
    case 'stamp': return `${ipadMode ? 'Tap' : 'Click'} to place the next numbered object`;
    default: return null;
  }
};

/** One-line instruction for the active tool, shown briefly at the bottom of the canvas area. */
export const ToolHint = () => {
  const { state: uiState } = useUI();
  const { state: docState } = useDocument();
  const [visible, setVisible] = useState(true);
  const hint = hintFor(uiState.tool, !!docState.measureCalibration, uiState.ipadMode);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), HINT_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [uiState.tool]);

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
