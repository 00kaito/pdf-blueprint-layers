/**
 * Default low-voltage device icons.
 * Each icon is SVG path data on a 24×24 grid (y down), drawn as a 2-unit outline with no fill —
 * the same path is rendered on the canvas (LvIcon) and in the PDF export (drawSvgPath), so both match.
 */
import type {CableSpec, CableType, LvSettings} from '@/lib/types';

export const LV_ICON_GRID = 24;

/** Icon type of a rack / IDF: the point that devices home-run their cables to. */
export const RACK_ICON = 'rack';

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
  antenna: {
    label: 'Antenna',
    d: 'M10 8a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M12 10v12 M8 22h8 M8 4a5.66 5.66 0 0 0 0 8 M16 4a5.66 5.66 0 0 1 0 8 M5 1.5a9 9 0 0 0 0 13 M19 1.5a9 9 0 0 1 0 13',
  },
  'access-control': {
    label: 'Face Panel / Access Control',
    d: 'M5 2h14v20H5z M9.5 9a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0 M8 17a4 4 0 0 1 8 0 M10 19.5h4',
  },
  speaker: {
    label: 'Speaker',
    d: 'M3 9h4l5-5v16l-5-5H3z M16 9a4 4 0 0 1 0 6 M19 6a8 8 0 0 1 0 12',
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
    data: [{ type: 'CAT6', count: 2 }],
    'floor-box': [{ type: 'CAT6', count: 4 }, { type: 'POWER', count: 1 }],
    tv: [{ type: 'CAT6', count: 2 }, { type: 'POWER', count: 1 }],
    speaker: [{ type: 'SPEAKER', count: 1 }],
    'access-control': [{ type: 'CAT6', count: 1 }, { type: 'POWER', count: 1 }],
    antenna: [{ type: 'COAX', count: 1 }],
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
  cableDefaults: { ...DEFAULT_LV_SETTINGS.cableDefaults, ...s?.cableDefaults },
});
