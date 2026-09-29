/**
 * Whether a pointer may draw (pencil, calibration line, measuring tape): in iPad mode fingers
 * scroll / zoom and only a stylus (or mouse) draws. Only the first finger of a multi-touch can
 * draw — later ones belong to a pinch.
 */
export const canDrawWith = (e: PointerEvent | React.PointerEvent, ipadMode: boolean) => {
  if (e.pointerType === 'mouse') return e.button === 0;
  if (e.pointerType === 'touch') return !ipadMode && e.isPrimary;
  return true;
};

/** Tools that draw with a pointer drag on the canvas (so the drag must not scroll). */
export const STROKE_TOOLS = ['draw', 'calibrate', 'measure'] as const;

export const isStrokeTool = (tool: string) => (STROKE_TOOLS as readonly string[]).includes(tool);
