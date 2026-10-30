import type {DocumentState, EditorObject} from './types';
import {normalizeLvSettings} from '@/core/lv-icons';
import {SERVER_OWNED_FIELDS} from '@shared/tech-ops';
import {withServerOwned} from './server-owned';

/**
 * Three-way merge of a plan edited on several devices at once.
 *
 * `base` is the plan as this tab last got it from the server, `local` this tab's plan (with edits
 * not saved yet), `remote` the server's plan now (others' saves). What only one side changed is
 * taken from that side; when both changed the same object, each field goes the same way, and only
 * a field changed on both sides keeps the local value (it is saved next). Comments, photos and
 * requests (server-owned) always come from the server.
 */

/** The parts of a plan that are saved and shared. */
export const SYNCED_KEYS = [
  'layers', 'objects', 'customIcons', 'exportSettings', 'autoNumbering', 'overlayOpacity', 'overlayOffset',
  'measureCalibration', 'lvSettings', 'cableRoutes', 'pdfFileId', 'overlayPdfFileId',
] as const;
export type SyncedDoc = Pick<DocumentState, typeof SYNCED_KEYS[number]>;

/** JSON with sorted keys: equal values give equal text whatever the key order (Postgres jsonb reorders). */
export const stableStringify = (value: unknown): string => JSON.stringify(value, (_key, v) =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.keys(v).sort().reduce<Record<string, unknown>>((acc, k) => { acc[k] = v[k]; return acc; }, {})
    : v);

const same = (a: unknown, b: unknown) => a === b || stableStringify(a) === stableStringify(b);

/** A stored or open plan in the shape the merge compares (defaults filled in like opening a project does). */
export const toSyncedDoc = (s: Record<string, any>): SyncedDoc => ({
  layers: s.layers ?? [],
  objects: s.objects ?? [],
  customIcons: s.customIcons ?? [],
  exportSettings: s.exportSettings,
  autoNumbering: s.autoNumbering,
  overlayOpacity: s.overlayOpacity,
  overlayOffset: s.overlayOffset,
  measureCalibration: s.measureCalibration ?? null,
  lvSettings: normalizeLvSettings(s.lvSettings),
  cableRoutes: s.cableRoutes ?? [],
  pdfFileId: s.pdfFileId ?? null,
  overlayPdfFileId: s.overlayPdfFileId ?? null,
});

const SERVER_OWNED = new Set<string>(SERVER_OWNED_FIELDS);

/** Same plan for saving purposes: equal apart from the server-owned fields (the server keeps those anyway). */
export const sameForSave = (a: SyncedDoc, b: SyncedDoc) =>
  SYNCED_KEYS.every(k => k === 'objects'
    ? a.objects.length === b.objects.length && a.objects.every((o, i) => {
      const other = b.objects[i];
      if (!other || other.id !== o.id) return false;
      const strip = (x: EditorObject) => Object.fromEntries(Object.entries(x).filter(([f]) => !SERVER_OWNED.has(f)));
      return same(strip(o), strip(other));
    })
    : same(a[k], b[k]));

/** Field by field: the side that changed a field wins; a field changed on both sides stays local. */
const mergeFields = <T extends object>(base: T | undefined, local: T, remote: T): T => {
  if (!base) return local;
  const out: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base)]);
  keys.forEach((k) => {
    const b = (base as any)[k], l = (local as any)[k], r = (remote as any)[k];
    const v = same(l, b) ? r : l;
    if (v !== undefined) out[k] = v;
  });
  return out as T;
};

/** Lists of items with ids (objects, layers, routes): per item, in the remote order, local additions after. */
const mergeById = <T extends { id: string }>(
  base: T[], local: T[], remote: T[], mergeItem: (b: T | undefined, l: T, r: T) => T,
): T[] => {
  const baseById = new Map(base.map(x => [x.id, x]));
  const localById = new Map(local.map(x => [x.id, x]));
  const remoteIds = new Set(remote.map(x => x.id));
  const out: T[] = [];
  for (const r of remote) {
    const b = baseById.get(r.id);
    const l = localById.get(r.id);
    if (l) out.push(same(l, b) ? r : same(r, b) ? l : mergeItem(b, l, r));
    // Deleted here: gone, unless someone else changed it meanwhile (then it stays, nothing is lost).
    else if (!b || !same(r, b)) out.push(r);
  }
  for (const l of local) {
    if (remoteIds.has(l.id)) continue;
    const b = baseById.get(l.id);
    // Added here (not saved yet) — or deleted by someone else but changed here: kept.
    if (!b || !same(l, b)) out.push(l);
  }
  return out;
};

const mergeObject = (b: EditorObject | undefined, l: EditorObject, r: EditorObject) =>
  withServerOwned(mergeFields(b, l, r), r);

/**
 * Merges `remote` into `local` with `base` as the common ancestor. Only the keys present in `local`
 * are merged, so an undo snapshot (a subset of the plan) can be rebased the same way.
 */
export const mergeDoc = <L extends Partial<SyncedDoc>>(base: SyncedDoc, local: L, remote: SyncedDoc): L => {
  const out: Record<string, unknown> = { ...local };
  for (const key of SYNCED_KEYS) {
    if (!(key in local)) continue;
    const b = base[key] as any, l = (local as any)[key], r = remote[key] as any;
    if (key === 'objects') {
      // Server-owned fields from the server even on objects this tab changed or did not change.
      const merged = mergeById<EditorObject>(b, l, r, mergeObject);
      const remoteById = new Map((r as EditorObject[]).map(o => [o.id, o]));
      out.objects = merged.map(o => { const ro = remoteById.get(o.id); return ro && o !== ro ? withServerOwned(o, ro) : o; });
    } else if (key === 'layers' || key === 'cableRoutes' || key === 'customIcons') {
      out[key] = mergeById(b ?? [], l ?? [], r ?? [], (bi, li, ri) => mergeFields(bi, li, ri));
    } else {
      out[key] = same(l, b) ? r : l;
    }
  }
  return out as L;
};
