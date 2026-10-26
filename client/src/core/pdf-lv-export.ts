import {degrees, LineCapStyle, PDFDocument, PDFFont, PDFPage, rgb} from 'pdf-lib';
import type {CableRoute, CableType, EditorObject, LvSettings, MeasureCalibration} from '@/lib/types';
import {getPhysicalCoords, hexToRgb} from './pdf-math';
import {
  buildCableSummary, computeCableRuns, getRacks, hasCables, isCableDevice, rackColorMap, rackLabel, routeColor, runFeet,
  SHARED_ROUTE_COLOR,
} from './cable-routing';
import {CABLE_LABEL, CABLE_TYPES, defaultObjectNames, formatCables, objectTypeName} from './lv-icons';
import {PLAN_CHANGE_BY_ID, PLAN_CHANGES} from './plan-change';
import {statusOf} from './status';
import {blindAreas, COVERAGE_BLIND, COVERAGE_FAR, COVERAGE_NEAR, COVERAGE_OPACITY, coverageCameras, coverageAreas, coverageObstacles, coverageOf, coverageZones, limitToAreas, type ShownZones} from './camera-coverage';
import type {Point} from './measure';

/**
 * Low-voltage information in the flattened PDF: cable routes, IDF colours and plan-change marks on
 * the plan, and appended pages with the cable summary, legend and device schedule.
 */

/** Badge text per plan change: the on-screen symbols are not in the PDF's standard fonts. */
const PDF_BADGE: Record<string, string> = { RELOCATE: '<>', REMOVE: 'X', NEW: '+', ON_HOLD: '||' };

const PL: Record<string, string> = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
};

/** Text the standard (WinAnsi) font can draw: Polish letters without accents, anything else as '?'. */
export const pdfSafeText = (font: PDFFont, text: string) => {
  const supported = new Set(font.getCharacterSet());
  return Array.from(text, ch => {
    if (supported.has(ch.codePointAt(0)!)) return ch;
    const plain = PL[ch] ?? ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return Array.from(plain).every(c => supported.has(c.codePointAt(0)!)) ? plain : '?';
  }).join('');
};

/** Draws on the plan page in canvas units, whatever the page rotation. */
export type PlanPainter = {
  page: PDFPage;
  /** PDF points per canvas unit. */
  k: number;
  at: (p: Point) => { x: number; y: number };
};

export const makePlanPainter = (page: PDFPage, k: number, pW: number, pH: number, rotation: number): PlanPainter => ({
  page, k, at: (p) => getPhysicalCoords(p.x * k, p.y * k, pW, pH, rotation),
});

const line = (pp: PlanPainter, a: Point, b: Point, color: string, width: number, dash?: number[], opacity = 1) =>
  pp.page.drawLine({
    start: pp.at(a), end: pp.at(b), thickness: width * pp.k, color: hexToRgb(color), opacity,
    dashArray: dash?.map(d => d * pp.k), lineCap: LineCapStyle.Round,
  });

/** A filled polygon in plan units (drawSvgPath flips y, hence the negated page y). */
/** Filled outline; with several rings the later ones are holes (outline first). */
const polygon = (pp: PlanPainter, pts: Point[] | Point[][], color: string, opacity: number) => {
  const rings = (Array.isArray(pts[0]) ? pts : [pts]) as Point[][];
  const d = rings.map(ring =>
    ring.map((p, i) => { const c = pp.at(p); return `${i ? 'L' : 'M'}${c.x.toFixed(2)} ${(-c.y).toFixed(2)}`; }).join(' ') + ' Z',
  ).join(' ');
  pp.page.drawSvgPath(d, {
    x: 0, y: 0, color: hexToRgb(color), opacity,
    borderColor: hexToRgb(color), borderWidth: 0.5 * pp.k, borderOpacity: 0.6,
  });
};

/** CCTV fields of view, as on screen: darker near sector, lighter far band, see-through. */
export const drawCameraCoverage = (pp: PlanPainter, objects: EditorObject[], visibleLayerIds: Set<string>, ftPerUnit: number | null) => {
  const obstacles = coverageObstacles(objects, visibleLayerIds);
  const areas = coverageAreas(objects, visibleLayerIds);
  const all: ShownZones[] = [];
  for (const cam of coverageCameras(objects, visibleLayerIds)) {
    const c = coverageOf(cam, ftPerUnit);
    if (!c) continue;
    // Cameras assigned to coverage areas stop at the areas' edges.
    const zones = limitToAreas(cam.id, coverageZones(c, obstacles), areas);
    all.push(zones);
    for (const rings of zones.far) polygon(pp, rings, COVERAGE_FAR, COVERAGE_OPACITY);
    for (const rings of zones.near) polygon(pp, rings, COVERAGE_NEAR, COVERAGE_OPACITY);
  }
  // Red: hidden behind a blindspot and seen by no camera at all.
  for (const rings of blindAreas(all, obstacles, areas)) polygon(pp, rings, COVERAGE_BLIND, COVERAGE_OPACITY);
};

/** Cable routes in their IDF colour, shared ones dashed grey — as on screen. */
export const drawCableRoutes = (pp: PlanPainter, routes: CableRoute[], objects: EditorObject[]) => {
  const colors = rackColorMap(objects);
  for (const r of routes) {
    const color = routeColor(r, colors);
    const shared = color === SHARED_ROUTE_COLOR;
    for (let i = 1; i < r.points.length; i++) {
      line(pp, r.points[i - 1], r.points[i], color, 2, shared ? [6, 4] : undefined, 0.85);
    }
    for (const p of r.points) {
      const c = pp.at(p);
      pp.page.drawEllipse({ x: c.x, y: c.y, xScale: 2 * pp.k, yScale: 2 * pp.k, color: hexToRgb(color), opacity: 0.85 });
    }
  }
};

/** Opacity of a device's icon in the export: faded when it is to be removed. */
export const lvIconOpacity = (o: EditorObject) => (o.change === 'REMOVE' ? 0.45 : 1);

/**
 * Marks around one object: relocation ghost + arrow, strike-through when removed, plan-change
 * badge (top right) and the dot of the IDF it home-runs to (top left, with several IDFs).
 */
/** IDF colour dot radius, unscaled canvas units: the editor's 12 px dot at the default zoom (4.1). */
const IDF_DOT_RADIUS = 1.4;

export const drawObjectLvMarks = (
  pp: PlanPainter, o: EditorObject, bold: PDFFont, idfColor: string | undefined, pageRotation: number,
) => {
  if (o.isFill) return;
  const { x, y, width: w, height: h } = o;
  const change = o.change ? PLAN_CHANGE_BY_ID[o.change] : null;

  if (o.change === 'RELOCATE' && o.changeOrigin) {
    const g = o.changeOrigin;
    const corners = [{ x: g.x, y: g.y }, { x: g.x + w, y: g.y }, { x: g.x + w, y: g.y + h }, { x: g.x, y: g.y + h }];
    corners.forEach((c, i) => line(pp, c, corners[(i + 1) % 4], '#9ca3af', 1, [3, 2]));
    const from = { x: g.x + w / 2, y: g.y + h / 2 };
    const to = { x: x + w / 2, y: y + h / 2 };
    const len = Math.hypot(to.x - from.x, to.y - from.y);
    const stop = Math.min(w, h) / 2 + 2;
    if (len > stop) {
      const ux = (to.x - from.x) / len, uy = (to.y - from.y) / len;
      const tip = { x: to.x - ux * stop, y: to.y - uy * stop };
      line(pp, from, tip, change!.color, 1.5, [4, 3]);
      const head = 5;
      for (const s of [1, -1]) {
        const a = Math.atan2(uy, ux) + Math.PI - s * 0.45;
        line(pp, tip, { x: tip.x + Math.cos(a) * head, y: tip.y + Math.sin(a) * head }, change!.color, 1.5);
      }
    }
  }

  if (o.change === 'REMOVE') {
    line(pp, { x, y }, { x: x + w, y: y + h }, change!.color, 1.5);
    line(pp, { x: x + w, y }, { x, y: y + h }, change!.color, 1.5);
  }

  const r = Math.max(3, Math.min(w, h) * 0.2);
  if (change) {
    const c = pp.at({ x: x + w, y });
    pp.page.drawEllipse({
      x: c.x, y: c.y, xScale: r * pp.k, yScale: r * pp.k,
      color: hexToRgb(change.color), borderColor: rgb(1, 1, 1), borderWidth: 0.5 * pp.k,
    });
    const text = PDF_BADGE[change.id];
    const size = r * 1.1 * pp.k;
    const tw = bold.widthOfTextAtSize(text, size) / pp.k;
    const start = pp.at({ x: x + w - tw / 2, y: y + r * 0.38 });
    pp.page.drawText(text, { x: start.x, y: start.y, size, font: bold, color: rgb(1, 1, 1), rotate: degrees(pageRotation) });
  }
  if (idfColor) {
    // Fixed size like the editor's dot (12 px at the default zoom), not growing with the object.
    const c = pp.at({ x, y });
    pp.page.drawEllipse({
      x: c.x, y: c.y, xScale: IDF_DOT_RADIUS * pp.k, yScale: IDF_DOT_RADIUS * pp.k,
      color: hexToRgb(idfColor), borderColor: rgb(1, 1, 1), borderWidth: IDF_DOT_RADIUS * 0.3 * pp.k,
    });
  }
};

/** Colour of the IDF a device (or rack) belongs to, when the plan has several IDFs. */
export const idfColorResolver = (objects: EditorObject[], routes: CableRoute[]) => {
  const racks = getRacks(objects);
  const colors = rackColorMap(objects);
  const runs = racks.length > 1 ? computeCableRuns(objects, routes) : null;
  return (o: EditorObject) => {
    if (!runs) return undefined;
    const rackId = colors.has(o.id) ? o.id : runs.get(o.id)?.rackId;
    return rackId ? colors.get(rackId) : undefined;
  };
};

// --- Appended summary pages ---

const PAGE: [number, number] = [792, 612]; // Letter, landscape
const M = 36;
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.85, 0.86, 0.88);

type Col = { title: string; w: number; align?: 'right' };

/** Appends the cable summary, legend and device schedule pages. */
export const appendLvPages = (
  pdfDoc: PDFDocument,
  fonts: { regular: PDFFont; bold: PDFFont },
  data: {
    projectName: string; objects: EditorObject[]; routes: CableRoute[];
    calibration: MeasureCalibration | null; settings: LvSettings;
    customIcons: { url: string; name: string }[];
  },
) => {
  const { objects, routes, calibration, settings } = data;
  if (!objects.some(isCableDevice) && getRacks(objects).length === 0) return;

  const summary = buildCableSummary(objects, routes, calibration, settings);
  const racks = getRacks(objects);
  const colors = rackColorMap(objects);
  const names = defaultObjectNames(objects, data.customIcons);
  const safe = (t: string, bold = false) => pdfSafeText(bold ? fonts.bold : fonts.regular, t);
  const ft = (n: number) => `${Math.round(n).toLocaleString('en-US')} ft`;

  let page = pdfDoc.addPage(PAGE);
  let y = PAGE[1] - M;
  const newPage = () => { page = pdfDoc.addPage(PAGE); y = PAGE[1] - M; };
  const ensure = (h: number, onBreak?: () => void) => { if (y - h < M) { newPage(); onBreak?.(); } };

  const text = (t: string, x: number, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; maxW?: number; align?: 'right' } = {}) => {
    const size = opts.size ?? 9;
    const font = opts.bold ? fonts.bold : fonts.regular;
    const full = safe(t, opts.bold);
    let s = full;
    // Too long for its column: cut and end with "...".
    for (let n = full.length; opts.maxW && n > 0 && font.widthOfTextAtSize(s, size) > opts.maxW; n--) s = full.slice(0, n) + '...';
    const tx = opts.align === 'right' && opts.maxW ? x + opts.maxW - font.widthOfTextAtSize(s, size) : x;
    page.drawText(s, { x: tx, y, size, font, color: opts.color ?? INK });
  };
  const heading = (t: string) => {
    ensure(30);
    y -= 8;
    text(t.toUpperCase(), M, { size: 9, bold: true, color: MUTED });
    y -= 14;
  };
  const table = (cols: Col[], rows: { cells: string[]; bold?: boolean; dot?: string }[]) => {
    const header = () => {
      let x = M;
      for (const c of cols) { text(c.title, x, { size: 8, bold: true, color: MUTED, maxW: c.w - 6, align: c.align }); x += c.w; }
      y -= 5;
      page.drawLine({ start: { x: M, y }, end: { x: PAGE[0] - M, y }, thickness: 0.6, color: RULE });
      y -= 11;
    };
    ensure(40);
    header();
    for (const r of rows) {
      ensure(14, header);
      let x = M;
      r.cells.forEach((cell, i) => {
        const c = cols[i];
        let cx = x;
        if (i === 0 && r.dot) {
          page.drawCircle({ x: x + 3, y: y + 3, size: 3, color: hexToRgb(r.dot) });
          cx += 10;
        }
        text(cell, cx, { size: 8.5, bold: r.bold, maxW: c.w - 6 - (cx - x), align: c.align });
        x += c.w;
      });
      y -= 4;
      page.drawLine({ start: { x: M, y }, end: { x: PAGE[0] - M, y }, thickness: 0.3, color: RULE });
      y -= 10;
    }
  };

  // Title
  text('Cable summary', M, { size: 16, bold: true });
  y -= 16;
  text(`${data.projectName || 'Project'}  ·  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, M, { color: MUTED });
  y -= 12;
  text(summary.hasScale
    ? `Lengths include ${settings.deviceSlackFt} ft device slack and ${settings.serviceLoopFt} ft service loop per cable · ${settings.portsPerPanel}-port patch panels · ${settings.boxLengthFt} ft Cat6 boxes`
    : 'No measuring scale set on the plan, so cable lengths are not calculated.', M, { size: 8, color: MUTED });
  y -= 6;

  // Per IDF
  const types: CableType[] = CABLE_TYPES.map(t => t.id)
    .filter(t => summary.total.cables[t].count > 0 || summary.removed[t].count > 0);
  heading('Per IDF');
  const typeW = Math.min(110, (PAGE[0] - 2 * M - 160 - 60 - 80 - 80) / Math.max(1, types.length));
  const rackCols: Col[] = [
    { title: 'IDF', w: 160 }, { title: 'Devices', w: 60, align: 'right' },
    ...types.map(t => ({ title: CABLE_LABEL[t], w: typeW, align: 'right' as const })),
    { title: 'Patch panels', w: 80, align: 'right' }, { title: 'Cat6 boxes', w: 80, align: 'right' },
  ];
  const rackCells = (r: typeof summary.total) => [
    r.name + (r.estimated > 0 && summary.hasScale ? ` (${r.estimated} est.)` : ''),
    String(r.devices),
    ...types.map(t => r.cables[t].count === 0 ? '0'
      : summary.hasScale ? `${r.cables[t].count}  /  ${ft(r.cables[t].feet)}` : String(r.cables[t].count)),
    String(r.patchPanels),
    summary.hasScale && r.cables.CAT6.feet > 0 ? String(Math.ceil(r.cables.CAT6.feet / settings.boxLengthFt)) : '-',
  ];
  table(rackCols, [
    ...summary.racks.map(r => ({ cells: rackCells(r), dot: r.rackId ? colors.get(r.rackId) : undefined })),
    { cells: rackCells(summary.total), bold: true },
  ]);
  if (types.some(t => summary.removed[t].count > 0)) {
    text(`Not counted (to be removed): ${types.filter(t => summary.removed[t].count > 0).map(t => `${summary.removed[t].count}x ${CABLE_LABEL[t]}`).join(', ')}`, M, { size: 8, color: MUTED });
    y -= 12;
  }
  if (summary.noCables.length > 0) {
    text(`Devices without cables: ${summary.noCables.length} (${summary.noCables.map(id => objects.find(o => o.id === id)?.name || names.get(id)).join(', ')})`,
      M, { size: 8, color: rgb(0.7, 0.42, 0), maxW: PAGE[0] - 2 * M });
    y -= 12;
  }

  // Progress per cable type
  heading('Install progress (cables)');
  table(
    [{ title: 'Cable', w: 160 }, ...['Planned', 'Pulled', 'Terminated', 'Tested / approved', 'Issue'].map(t => ({ title: t, w: 90, align: 'right' as const }))],
    types.map(t => {
      const p = summary.progress[t];
      return { cells: [CABLE_LABEL[t], String(p.planned), String(p.pulled), String(p.terminated), String(p.tested), String(p.issue)] };
    }),
  );

  // Plan changes
  heading('Plan changes');
  table(
    [{ title: 'Change', w: 160 }, { title: 'Points', w: 60, align: 'right' }, { title: '', w: 20 }, { title: 'Devices', w: PAGE[0] - 2 * M - 240 }],
    PLAN_CHANGES.map(c => ({
      cells: [c.label, String(summary.changes[c.id].length), '',
        summary.changes[c.id].map(id => objects.find(o => o.id === id)?.name || names.get(id) || '').join(', ')],
      dot: c.color,
    })),
  );

  // Legend
  heading('Legend');
  ensure(16 * (racks.length + PLAN_CHANGES.length + 2));
  const legendRow = (draw: (x: number, cy: number) => void, label: string) => {
    draw(M, y + 3);
    text(label, M + 34, { size: 8.5 });
    y -= 14;
  };
  for (const r of racks) {
    const c = hexToRgb(colors.get(r.id)!);
    legendRow((x, cy) => page.drawLine({ start: { x, y: cy }, end: { x: x + 24, y: cy }, thickness: 2, color: c }),
      `${rackLabel(racks, r.id)} — cable routes and devices home-running to it`);
  }
  legendRow((x, cy) => page.drawLine({ start: { x, y: cy }, end: { x: x + 24, y: cy }, thickness: 2, color: hexToRgb(SHARED_ROUTE_COLOR), dashArray: [4, 3] }),
    'Shared route (any IDF)');
  for (const c of PLAN_CHANGES) {
    legendRow((x, cy) => {
      page.drawCircle({ x: x + 12, y: cy, size: 5, color: hexToRgb(c.color) });
      const t = PDF_BADGE[c.id];
      page.drawText(t, { x: x + 12 - fonts.bold.widthOfTextAtSize(t, 5.5) / 2, y: cy - 2, size: 5.5, font: fonts.bold, color: rgb(1, 1, 1) });
    }, c.label + (c.id === 'RELOCATE' ? ' (dashed box = old position)' : c.id === 'REMOVE' ? ' (crossed out, not counted)' : ''));
  }

  // Device schedule
  newPage();
  text('Device schedule', M, { size: 16, bold: true });
  y -= 22;
  const rackOrder = new Map(racks.map((r, i) => [r.id, i]));
  const devices = objects.filter(isCableDevice).map(o => {
    const run = summary.runs.get(o.id);
    const feet = run && hasCables(o) ? runFeet(run, calibration, settings) : null;
    return { o, name: o.name || names.get(o.id) || '', run, feet };
  }).sort((a, b) =>
    (rackOrder.get(a.run?.rackId ?? '') ?? 99) - (rackOrder.get(b.run?.rackId ?? '') ?? 99)
    || a.name.localeCompare(b.name, undefined, { numeric: true }));
  table(
    [
      { title: 'Device', w: 120 }, { title: 'Type', w: 120 }, { title: 'IDF', w: 80 }, { title: 'Cables', w: 140 },
      { title: 'Run / cable', w: 75, align: 'right' }, { title: '', w: 15 }, { title: 'Status', w: 85 }, { title: 'Plan change', w: PAGE[0] - 2 * M - 635 },
    ],
    devices.map(({ o, name, run, feet }) => ({
      cells: [
        name, objectTypeName(o, data.customIcons), run ? rackLabel(racks, run.rackId) : '-',
        formatCables(o.cables).replace(/×/g, 'x'),
        feet !== null ? ft(feet) + (run && !run.routed ? ' est.' : '') : '-', '',
        statusOf(o.status ?? 'PLANNED')?.label ?? o.status ?? '', o.change ? PLAN_CHANGE_BY_ID[o.change].label : '',
      ],
      dot: run ? colors.get(run.rackId) : undefined,
    })),
  );
};
