/**
 * Builds SVG path data for various icon types.
 * Coordinates are relative to the bounding box (w, h) and optional side offsets.
 */
export const buildIconPath = (
  iconType: string, 
  w: number, 
  h: number, 
  minSide: number, 
  offX: number, 
  offY: number
): string | null => {
  const midX = w / 2;
  const midY = h / 2;
  const top = offY + minSide;
  const bottom = offY;
  const left = offX;
  const right = offX + minSide;

  const shapes: Record<string, string> = {
    triangle: `M ${midX} ${top} L ${right} ${bottom} L ${left} ${bottom} Z`,
    star:     `M ${midX} ${top} L ${right} ${midY} L ${midX} ${bottom} L ${left} ${midY} Z`,
    heart:    `M ${midX} ${top} L ${right} ${midY} L ${midX} ${bottom} L ${left} ${midY} Z`, // Placeholder
    diamond:  `M ${midX} ${top} L ${right} ${midY} L ${midX} ${bottom} L ${left} ${midY} Z`,
    hexagon:  `M ${left + minSide * 0.25} ${bottom} L ${right - minSide * 0.25} ${bottom} L ${right} ${midY} L ${right - minSide * 0.25} ${top} L ${left + minSide * 0.25} ${top} L ${left} ${midY} Z`,
    'arrow-right': `M ${left} ${midY - minSide * 0.25} L ${midX} ${midY - minSide * 0.25} L ${midX} ${bottom} L ${right} ${midY} L ${midX} ${top} L ${midX} ${midY + minSide * 0.25} L ${left} ${midY + minSide * 0.25} Z`,
    camera: `M ${left} ${bottom} L ${right} ${bottom} L ${right} ${bottom + minSide * 0.8} L ${left + minSide * 0.7} ${bottom + minSide * 0.8} L ${left + minSide * 0.6} ${top} L ${left + minSide * 0.4} ${top} L ${left + minSide * 0.3} ${bottom + minSide * 0.8} L ${left} ${bottom + minSide * 0.8} Z`
  };

  return shapes[iconType] ?? null;
};
