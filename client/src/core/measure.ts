import type {MeasureCalibration} from '@/lib/types';

export type Point = { x: number; y: number };

/** Length of a segment in unscaled canvas units. */
export const segmentLength = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** Feet per unscaled canvas unit, or null when there is no usable calibration. */
export const feetPerUnit = (cal: MeasureCalibration | null): number | null => {
  if (!cal) return null;
  const len = segmentLength({ x: cal.x1, y: cal.y1 }, { x: cal.x2, y: cal.y2 });
  return len > 0 && cal.feet > 0 ? cal.feet / len : null;
};

/** Constrains `p` to a horizontal or vertical line through `start` (Shift). */
export const snapToAxis = (start: Point, p: Point): Point =>
  Math.abs(p.x - start.x) > Math.abs(p.y - start.y) ? { x: p.x, y: start.y } : { x: start.x, y: p.y };

/** 12.354 → `12' 4 1/4"` (rounded to the nearest 1/4 inch). */
export const formatFeetInches = (feet: number): string => {
  const quarters = Math.round(Math.abs(feet) * 48); // 1/4" steps
  const ft = Math.floor(quarters / 48);
  const inchQuarters = quarters % 48;
  const inches = Math.floor(inchQuarters / 4);
  const frac = ['', ' 1/4', ' 1/2', ' 3/4'][inchQuarters % 4];
  return `${feet < 0 ? '-' : ''}${ft}' ${inches}${frac}"`;
};

/** Decimal feet with up to 2 decimals, e.g. `12.35 ft`. */
export const formatFeet = (feet: number): string =>
  `${feet.toLocaleString(undefined, { maximumFractionDigits: 2 })} ft`;

/**
 * Parses a length typed by the user into feet. Accepts decimal feet (`12.5`, `12,5`, `12.5 ft`),
 * feet and inches (`12' 6"`, `12'6`, `12 ft 6 in`) and inches only (`150"`, `150 in`).
 * Returns null when the text is not a positive length.
 */
export const parseFeet = (text: string): number | null => {
  const s = text.trim().toLowerCase().replace(/,/g, '.').replace(/[’′]/g, "'").replace(/[”″]/g, '"');
  if (!s) return null;
  const num = '(\\d+(?:\\.\\d+)?|\\.\\d+)';
  let feet: number | null = null;

  let m = s.match(new RegExp(`^${num}\\s*(?:'|ft|feet|foot)\\s*(?:${num}\\s*(?:"|in|inch|inches)?)?$`));
  if (m) feet = parseFloat(m[1]) + (m[2] ? parseFloat(m[2]) / 12 : 0);

  if (feet === null && (m = s.match(new RegExp(`^${num}\\s*(?:"|in|inch|inches)$`)))) feet = parseFloat(m[1]) / 12;

  if (feet === null && (m = s.match(new RegExp(`^${num}$`)))) feet = parseFloat(m[1]);

  return feet !== null && Number.isFinite(feet) && feet > 0 ? feet : null;
};
