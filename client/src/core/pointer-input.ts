/**
 * Set once an Apple Pencil / stylus has touched the canvas in this session. From then on, in iPad
 * mode, fingers pan while drawing (palm rejection); before that a finger draws, so tablets without
 * a pencil still work.
 */
let penSeen = false;
export const notePointerType = (pointerType: string) => {
  if (pointerType === 'pen') penSeen = true;
};
export const hasSeenPen = () => penSeen;

/**
 * Whether a finger (one finger — two fingers always pan / zoom) operates the tool rather than
 * scrolling the blueprint. The measuring tools take a finger always: one short line, then the tool
 * is put down. The pencil in iPad mode only once a stylus has been used.
 */
export const fingerUsesTool = (tool: string, ipadMode: boolean) => {
  if (tool === 'measure' || tool === 'calibrate') return true;
  if (tool === 'draw') return !ipadMode || !penSeen;
  return false;
};

/**
 * Whether a pointer may draw (pencil, calibration line, measuring tape). A stylus or mouse always
 * can; a finger per `fingerUsesTool`. Only the first finger of a multi-touch can draw — later ones
 * belong to a pinch.
 */
export const canDrawWith = (e: PointerEvent | React.PointerEvent, ipadMode: boolean, tool: string) => {
  notePointerType(e.pointerType);
  if (e.pointerType === 'mouse') return e.button === 0;
  if (e.pointerType === 'touch') return e.isPrimary && fingerUsesTool(tool, ipadMode);
  return true;
};

/** Tools that draw with a pointer drag on the canvas (so the drag must not scroll). */
export const STROKE_TOOLS = ['draw', 'calibrate', 'measure'] as const;

export const isStrokeTool = (tool: string) => (STROKE_TOOLS as readonly string[]).includes(tool);
