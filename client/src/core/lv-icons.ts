/**
 * Default low-voltage device icons.
 * Each icon is SVG path data on a 24×24 grid (y down), drawn as a 2-unit outline with no fill —
 * the same path is rendered on the canvas (LvIcon) and in the PDF export (drawSvgPath), so both match.
 */
import type {CableSpec, CableType, LvSettings} from '@/lib/types';

export const LV_ICON_GRID = 24;

/** Icon type of a rack / IDF: the point that devices home-run their cables to. */
export const RACK_ICON = 'rack';

/** Icon type of a camera blindspot: a resizable rectangle cameras cannot see past (see camera-coverage). */
export const BLINDSPOT_ICON = 'blindspot';

/** Icon type of a 360° (fisheye) CCTV camera; the regular one is 'cctv'. */
export const CAMERA_360_ICON = 'cctv-360';

/** Content of a coverage area: a closed outline ('path' object) that given cameras must see (see camera-coverage). */
export const COVERAGE_AREA_ICON = 'coverage-area';

export const LV_ICONS: Record<string, { label: string; d: string }> = {
  'floor-box': {
    label: 'Floor Box',
    d: 'M3 3h18v18H3z M7 7h10v10H7z M10 10v4 M14 10v4',
  },
  data: {
    label: 'Data',
    d: 'M4 4h16v16H4z M8 16v-6h2v-2h4v2h2v6z M10.5 16v-2 M13.5 16v-2',
  },
  tv: {
    label: 'TV',
    d: 'M2 4h20v13H2z M8 21h8 M12 17v4',
  },
  'access-control': {
    label: 'Face Panel / Access Control',
    d: 'M5 2h14v20H5z M9.5 9a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0 M8 17a4 4 0 0 1 8 0 M10 19.5h4',
  },
  speaker: {
    label: 'Speaker',
    d: 'M3 9h4l5-5v16l-5-5H3z M16 9a4 4 0 0 1 0 6 M19 6a8 8 0 0 1 0 12',
  },
  'ceiling-speaker': {
    label: 'Ceiling Speaker',
    d: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M11 12h2',
  },
  wap: {
    label: 'Wireless Access Point',
    d: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M7 11a7 7 0 0 1 10 0 M9.5 14a3.5 3.5 0 0 1 5 0 M11.5 17h1',
  },
  cctv: {
    label: 'CCTV Camera',
    d: 'M2 8h13v8H2z M15 10l6-3v10l-6-3',
  },
  [CAMERA_360_ICON]: {
    label: 'CCTV 360° Camera',
    d: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M12 2v3 M12 19v3 M2 12h3 M19 12h3',
  },
  scheduler: {
    label: 'Scheduler',
    d: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 6v6l4 2',
  },
  'control-panel': {
    label: 'Control Panel',
    d: 'M3 3h18v18H3z M6 6h12v5H6z M6 14h4v4H6z M14 14h4v4h-4z',
  },
  [RACK_ICON]: {
    label: 'Rack / IDF',
    d: 'M5 2h14v20H5z M8 6h8 M8 10h8 M8 14h8 M8 18h8',
  },
};

export const LV_ICON_TYPES = Object.keys(LV_ICONS);

/** Names of the plain shape icons. */
const SHAPE_LABELS: Record<string, string> = {
  square: 'Square', circle: 'Circle', triangle: 'Triangle', star: 'Star', heart: 'Heart',
  hexagon: 'Hexagon', 'arrow-right': 'Arrow', camera: 'Camera', [BLINDSPOT_ICON]: 'Camera blindspot',
};

/**
 * What an object is, for lists and history: the device type ("TV", "Ceiling Speaker") or library
 * icon name rather than the object kind ("Icon", "Image").
 */
export const objectTypeName = (
  o: { type: string; content?: string },
  customIcons: { url: string; name: string }[] = [],
): string => {
  if (o.type === 'icon' && o.content) return LV_ICONS[o.content]?.label ?? SHAPE_LABELS[o.content] ?? 'Icon';
  if (o.type === 'path' && o.content === BLINDSPOT_ICON) return 'Blindspot wall';
  if (o.type === 'path' && o.content === COVERAGE_AREA_ICON) return 'Coverage area';
  if (o.type === 'image') return customIcons.find(i => i.url === o.content)?.name || 'Image';
  return o.type.charAt(0).toUpperCase() + o.type.slice(1);
};

/**
 * Default name of every object: its type numbered within that type, in placing order across the
 * whole plan ("Floor Box 1", "Floor Box 2", "TV 1"). Text shows its own content.
 */
export const defaultObjectNames = (
  objects: { id: string; type: string; content?: string; isFill?: boolean }[],
  customIcons: { url: string; name: string }[] = [],
): Map<string, string> => {
  const counts = new Map<string, number>();
  const names = new Map<string, string>();
  for (const o of objects) {
    if (o.type === 'text') { names.set(o.id, o.content || 'Text Object'); continue; }
    const type = o.isFill ? 'Fill' : objectTypeName(o, customIcons);
    const n = (counts.get(type) ?? 0) + 1;
    counts.set(type, n);
    names.set(o.id, `${type} ${n}`);
  }
  return names;
};

export const CABLE_TYPES: { id: CableType; label: string }[] = [
  { id: 'CAT6', label: 'Cat6' },
  { id: 'SPEAKER', label: 'Speaker' },
  { id: 'POWER', label: 'Power' },
  { id: 'COAX', label: 'Coax' },
  { id: 'FIBER', label: 'Fiber' },
  { id: 'OTHER', label: 'Other' },
];

export const CABLE_LABEL = Object.fromEntries(CABLE_TYPES.map(c => [c.id, c.label])) as Record<CableType, string>;

/** "2× Cat6, 1× Power" */
export const formatCables = (cables: CableSpec[] | undefined) =>
  cables?.length ? cables.map(c => `${c.count}× ${CABLE_LABEL[c.type]}`).join(', ') : 'none';

export const DEFAULT_LV_SETTINGS: LvSettings = {
  // Starting point per device type; editing a device's cables replaces its type's default.
  cableDefaults: {
    tv: [{ type: 'CAT6', count: 3 }],
    speaker: [{ type: 'SPEAKER', count: 1 }],
    'ceiling-speaker': [{ type: 'SPEAKER', count: 1 }],
    cctv: [{ type: 'CAT6', count: 2 }],
    [CAMERA_360_ICON]: [{ type: 'CAT6', count: 2 }],
    // Access control needs 24 V, so it is the only device with a power cable.
    'access-control': [{ type: 'CAT6', count: 1 }, { type: 'POWER', count: 1 }],
    data: [{ type: 'CAT6', count: 1 }],
    'floor-box': [{ type: 'CAT6', count: 1 }],
    wap: [{ type: 'CAT6', count: 1 }],
    'control-panel': [{ type: 'CAT6', count: 1 }],
    scheduler: [{ type: 'CAT6', count: 1 }],
  },

  portsPerPanel: 24,
  serviceLoopFt: 10,
  deviceSlackFt: 15,
  boxLengthFt: 1000,
};

/**
 * Key of an object's device type in `cableDefaults`: the icon type, or a library image's URL.
 * Inline images (data URLs) have no stable type to share a default with.
 */
export const deviceKey = (o: { type: string; content?: string; isFill?: boolean }): string | null => {
  if (!o.content || o.isFill) return null;
  if (o.type === 'icon') return o.content;
  if (o.type === 'image' && !o.content.startsWith('data:') && o.content.length <= 512) return o.content;
  return null;
};

/** Settings of a stored project merged over the defaults (older projects have none). */
export const normalizeLvSettings = (s: Partial<LvSettings> | undefined): LvSettings => ({
  ...DEFAULT_LV_SETTINGS,
  ...s,
  cableDefaults: withoutStrayPower({ ...DEFAULT_LV_SETTINGS.cableDefaults, ...s?.cableDefaults }),
});

/**
 * Only access control (24 V) gets a power cable by default. Projects saved before that rule kept
 * power in other types' defaults (e.g. floor box); new devices of those types no longer inherit it.
 */
const withoutStrayPower = (defaults: LvSettings['cableDefaults']) =>
  Object.fromEntries(Object.entries(defaults).map(([key, cables]) => [
    key, key === 'access-control' ? cables : cables.filter(c => c.type !== 'POWER'),
  ]));
