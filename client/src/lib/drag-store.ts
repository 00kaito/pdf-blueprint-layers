import {useSyncExternalStore} from 'react';
import type {Box, Guide} from '@/core/snapping';

/** Live position of the object being dragged — changes on every pointer move. */
export type DragState = { objectId: string; box: Box; guides: Guide[] } | null;

let current: DragState = null;
const listeners = new Set<() => void>();

/**
 * Kept outside the editor reducer on purpose: a drag updates this ~60×/s and only the guide
 * overlay needs it, while a reducer update would re-render the whole canvas each time.
 */
export const dragStore = {
  set(next: DragState) {
    current = next;
    listeners.forEach(l => l());
  },
  get: () => current,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export const useDragState = () => useSyncExternalStore(dragStore.subscribe, dragStore.get, dragStore.get);
