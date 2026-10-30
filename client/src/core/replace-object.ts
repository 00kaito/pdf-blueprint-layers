import type {CableSpec, EditorObject} from '@/lib/types';
import {BLINDSPOT_ICON, deviceKey, RACK_ICON} from './lv-icons';
import {DEFAULT_ICON_COLOR} from './constants';
import {isCamera} from './camera-coverage';

/** What a placed object becomes: an icon type (LV device / shape) or a library image. */
export type ReplaceTarget = { type: 'icon' | 'image'; content: string };

/** Placed devices / images can be swapped for another type; text, drawings, fills, racks and blindspots not. */
export const canReplace = (o: EditorObject) =>
  !o.isFill && (o.type === 'icon' || o.type === 'image')
  && o.content !== BLINDSPOT_ICON && o.content !== RACK_ICON;

const sameCables = (a: CableSpec[] | undefined, b: CableSpec[] | undefined) =>
  JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

/**
 * Swaps objects for another type and keeps everything that still applies: position (centre),
 * rotation, layer, label and its placement, status / issue, plan change, notes, photos, comments,
 * requests, IDF and mount height. Only what belongs to the old type goes: its picture, the camera
 * field of view (unless the new type is a camera too) and cables that were just the old type's
 * default (they become the new type's default; cables edited by hand stay).
 * Size: that of the new type already on the plan, else the object's own (square for an icon).
 */
export const replaceObjects = (
  objects: EditorObject[],
  ids: string[],
  target: ReplaceTarget,
  cableDefaults: Record<string, CableSpec[]>,
): EditorObject[] => {
  const replacing = new Set(ids.filter(id => {
    const o = objects.find(obj => obj.id === id);
    return !!o && canReplace(o);
  }));
  if (replacing.size === 0) return objects;

  const targetKey = deviceKey(target);
  const sizeOfType = [...objects].reverse().find(o => !replacing.has(o.id) && !o.isFill && targetKey && deviceKey(o) === targetKey);
  const newDefault = targetKey ? cableDefaults[targetKey] : undefined;
  const noLongerCameras = new Set<string>();

  const replaced = objects.map((o) => {
    if (!replacing.has(o.id)) return o;
    const oldKey = deviceKey(o);
    const side = (o.width + o.height) / 2;
    const width = sizeOfType?.width ?? (target.type === 'icon' ? side : o.width);
    const height = sizeOfType?.height ?? (target.type === 'icon' ? side : o.height);
    const keepCables = o.cables !== undefined && !(oldKey && sameCables(o.cables, cableDefaults[oldKey]));
    const { camera, ...rest } = o;
    const next: EditorObject = {
      ...rest,
      type: target.type,
      content: target.content,
      x: o.x + (o.width - width) / 2,
      y: o.y + (o.height - height) / 2,
      width,
      height,
      color: target.type === 'icon' ? (o.type === 'icon' ? o.color : DEFAULT_ICON_COLOR) : o.color,
      cables: keepCables ? o.cables : newDefault?.map(c => ({ ...c })),
    };
    if (isCamera(next)) {
      if (camera) next.camera = camera;
    } else if (isCamera(o)) {
      noLongerCameras.add(o.id);
    }
    return next;
  });

  if (noLongerCameras.size === 0) return replaced;
  // Coverage areas no longer count on cameras that are now something else.
  return replaced.map(o => o.coverageCameraIds?.some(id => noLongerCameras.has(id))
    ? { ...o, coverageCameraIds: o.coverageCameraIds.filter(id => !noLongerCameras.has(id)) }
    : o);
};
