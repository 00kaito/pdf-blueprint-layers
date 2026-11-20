import type {UIState} from './types';

/**
 * One-letter tool shortcuts: handled by the Canvas' keyboard handler, listed by the `?` dialog — one
 * list, so the two cannot drift apart.
 */
export const TOOL_SHORTCUTS: { key: string; tool: UIState['tool']; label: string }[] = [
  { key: 'v', tool: 'select', label: 'Select' },
  { key: 'p', tool: 'draw', label: 'Draw (Shift = straight line)' },
  { key: 'b', tool: 'fill', label: 'Fill area' },
  { key: 'm', tool: 'measure', label: 'Measuring tape (needs the scale)' },
  { key: 'l', tool: 'path-measure', label: 'Path measure' },
  { key: 'k', tool: 'calibrate', label: 'Scale probe' },
  { key: 'r', tool: 'route', label: 'Cable route' },
  { key: 'j', tool: 'jumper', label: 'Jumper' },
  { key: 'w', tool: 'wall', label: 'Blindspot wall' },
];

/** The tool of a pressed key, if it is a shortcut. */
export const toolForKey = (key: string) => TOOL_SHORTCUTS.find(s => s.key === key.toLowerCase())?.tool;
