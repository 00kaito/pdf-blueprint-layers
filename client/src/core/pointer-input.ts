/** Tools that draw with a pointer drag on the canvas (so the drag must not scroll). */
export const STROKE_TOOLS = ['draw', 'calibrate', 'measure'] as const;

export const isStrokeTool = (tool: string) => (STROKE_TOOLS as readonly string[]).includes(tool);

/** Tools that act on a tap / click on the blueprint (in stylus-only mode a finger tap does not). */
export const TAP_TOOLS = ['fill', 'stamp'] as const;

export const isTapTool = (tool: string) => (TAP_TOOLS as readonly string[]).includes(tool);

/**
 * Whether one finger operates a stroke tool rather than scrolling the blueprint. One fixed rule:
 * in stylus-only mode fingers never use tools (they pan, zoom and tap-select); otherwise a finger
 * uses them like a mouse. Two fingers always pan / zoom.
 */
export const fingerUsesTool = (tool: string, stylusOnly: boolean) => isStrokeTool(tool) && !stylusOnly;

/**
 * Whether a pointer may draw (pencil, calibration line, measuring tape). A stylus or mouse always
 * can; a finger only outside stylus-only mode, and only the first finger — later ones belong to a pinch.
 */
export const canDrawWith = (e: PointerEvent | React.PointerEvent, stylusOnly: boolean) => {
  if (e.pointerType === 'mouse') return e.button === 0;
  if (e.pointerType === 'touch') return e.isPrimary && !stylusOnly;
  return true;
};
