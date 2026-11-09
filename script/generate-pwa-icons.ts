/**
 * Generates the app icons for installing the app (PWA manifest, iPhone home screen) from the same
 * design as `client/public/favicon.svg`: blue blueprint sheet, white floor plan, amber device.
 * Plain Node (zlib), no image libraries: shapes are rasterised with 4×4 supersampling.
 *
 *   npx tsx script/generate-pwa-icons.ts
 *
 * Writes into client/public/icons/:
 * - icon-192.png, icon-512.png   rounded sheet on transparent ("any" purpose)
 * - icon-maskable-512.png        full-bleed sheet, drawing inside the 80% safe zone (Android masks it)
 * - apple-touch-icon.png         180×180 full-bleed, opaque (iOS rounds the corners itself)
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

type RGBA = [number, number, number, number];
type P = [number, number];

const BLUE: RGBA = [37, 99, 235, 255];
const WHITE: RGBA = [255, 255, 255, 255];
const AMBER: RGBA = [245, 158, 11, 255];
const GRID: RGBA = [255, 255, 255, Math.round(255 * 0.14)];

/** The favicon's drawing, in its 32×32 units. */
const WALLS: P[][] = [
  [[6.5, 12], [6.5, 25.5], [25.5, 25.5], [25.5, 6.5], [13, 6.5]],
  [[16, 25.5], [16, 18], [20, 18]],
];
const WALL_HALF_WIDTH = 1.3;
const DEVICE = { c: [20, 12] as P, r: 3.4, stroke: 0.8 };

const distToSegment = ([px, py]: P, [ax, ay]: P, [bx, by]: P) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

const insideRoundedRect = ([x, y]: P, size: number, r: number) => {
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const cx = Math.min(Math.max(x, r), size - r), cy = Math.min(Math.max(y, r), size - r);
  return Math.hypot(x - cx, y - cy) <= r;
};

/**
 * On a grid line: every 8 units, like the favicon's 8 / 16 / 24. Where the drawing is shrunk the grid
 * goes on to the sheet's edge; at full size the lines at 0 / 32 would be the border, so they are left out.
 */
const onGridLine = (v: number, edges: boolean) => {
  const m = ((v % 8) + 8) % 8;
  const atEdge = Math.abs(v) <= 0.5 || Math.abs(v - 32) <= 0.5;
  return (m <= 0.5 || m >= 7.5) && (edges || !atEdge);
};

/** Colour of one point of the sheet (32-unit drawing coordinates). */
const colourAt = (u: P, edges: boolean): RGBA => {
  const d = Math.hypot(u[0] - DEVICE.c[0], u[1] - DEVICE.c[1]);
  if (d <= DEVICE.r - DEVICE.stroke) return AMBER;
  if (d <= DEVICE.r + DEVICE.stroke) return WHITE;
  if (WALLS.some(line => line.slice(1).some((b, i) => distToSegment(u, line[i], b) <= WALL_HALF_WIDTH))) return WHITE;
  return onGridLine(u[0], edges) || onGridLine(u[1], edges) ? blend(GRID, BLUE) : BLUE;
};

const blend = (top: RGBA, under: RGBA): RGBA => {
  const a = top[3] / 255;
  return [0, 1, 2].map(i => Math.round(top[i] * a + under[i] * (1 - a))).concat(255) as RGBA;
};

/**
 * `fullBleed`: the sheet fills the square (no rounding); `scale`: the drawing's size relative to the
 * icon (the maskable icon keeps it inside the safe zone).
 */
const render = (size: number, { fullBleed, scale }: { fullBleed: boolean; scale: number }) => {
  const SS = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = (x + (sx + 0.5) / SS) / size * 32, fy = (y + (sy + 0.5) / SS) / size * 32;
          const sheet = fullBleed || insideRoundedRect([fx, fy], 32, 6);
          // The drawing, scaled about the centre.
          const u: P = [16 + (fx - 16) / scale, 16 + (fy - 16) / scale];
          const c: RGBA = sheet ? colourAt(u, scale < 1) : [0, 0, 0, 0];
          // Premultiplied, so the anti-aliased edge has no dark fringe.
          acc[0] += c[0] * c[3]; acc[1] += c[1] * c[3]; acc[2] += c[2] * c[3]; acc[3] += c[3];
        }
      }
      const i = (y * size + x) * 4, a = acc[3];
      px[i] = a ? Math.round(acc[0] / a) : 0;
      px[i + 1] = a ? Math.round(acc[1] / a) : 0;
      px[i + 2] = a ? Math.round(acc[2] / a) : 0;
      px[i + 3] = Math.round(a / (SS * SS));
    }
  }
  return px;
};

// --- Minimal PNG encoder (RGBA, 8 bit) ---
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const png = (size: number, rgba: Buffer) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
};

const outDir = path.resolve(process.cwd(), 'client/public/icons');
fs.mkdirSync(outDir, { recursive: true });
const icons: [string, number, { fullBleed: boolean; scale: number }][] = [
  ['icon-192.png', 192, { fullBleed: false, scale: 1 }],
  ['icon-512.png', 512, { fullBleed: false, scale: 1 }],
  ['icon-maskable-512.png', 512, { fullBleed: true, scale: 0.78 }],
  ['apple-touch-icon.png', 180, { fullBleed: true, scale: 0.86 }],
];
for (const [name, size, opts] of icons) {
  fs.writeFileSync(path.join(outDir, name), png(size, render(size, opts)));
  console.log(`wrote client/public/icons/${name}`);
}
