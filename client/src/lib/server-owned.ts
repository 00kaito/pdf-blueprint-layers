import type {EditorObject} from './types';
import {SERVER_OWNED_FIELDS} from '@shared/tech-ops';

/** Copies the fields only ops change (comments, photos, requests) from `from` onto `to`. */
export const withServerOwned = (to: EditorObject, from: EditorObject): EditorObject => {
  const next: Record<string, unknown> = { ...to };
  for (const key of SERVER_OWNED_FIELDS) {
    if (from[key] === undefined) delete next[key]; else next[key] = from[key];
  }
  return next as EditorObject;
};
