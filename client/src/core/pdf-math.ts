import {rgb, RGB} from 'pdf-lib';

/**
 * Converts hex color string to PDF-lib RGB object.
 */
export const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
};

/**
 * Maps visual coordinates from the editor to physical PDF coordinates
 * based on the page rotation attribute.
 */
export const getPhysicalCoords = (
  vx: number, 
  vy: number, 
  pW: number, 
  pH: number, 
  rotation: number
): { x: number; y: number } => {
  switch (rotation) {
    case 90: 
      return { x: vy, y: vx };
    case 180: 
      return { x: pW - vx, y: vy };
    case 270: 
      return { x: pW - vy, y: pH - vx };
    case 0:
    default: 
      return { x: vx, y: pH - vy };
  }
};

/**
 * Calculates visual dimensions based on physical size and rotation.
 */
export const getVisualDimensions = (pW: number, pH: number, rotation: number) => {
  return (rotation === 90 || rotation === 270) 
    ? { vW: pH, vH: pW } 
    : { vW: pW, vH: pH };
};
