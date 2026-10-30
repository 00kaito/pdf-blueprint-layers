import {DocumentState, EditorAction, EditorState} from './types';
import {objectTypeName} from '@/core/lv-icons';
import {withServerOwned} from './server-owned';

/** Maximum number of undo steps kept in memory. */
export const HISTORY_LIMIT = 100;

/** Consecutive edits of the same kind/target within this window collapse into one undo step. */
const COALESCE_WINDOW_MS = 1000;

/** Document fields restored by undo/redo. File handles and ids are deliberately excluded. */
type Snapshot = Pick<
  DocumentState,
  'layers' | 'objects' | 'overlayOpacity' | 'overlayOffset' | 'autoNumbering' | 'exportSettings' | 'measureCalibration' | 'lvSettings' | 'cableRoutes'
>;

export type HistoryEntry = {
  id: number;
  label: string;
  timestamp: number;
  /** Document state as it was *before* this change was applied. */
  before: Snapshot;
  /** Selection before the change, restored on undo. */
  selectionBefore: string[];
};

export type HistoryState = {
  editor: EditorState;
  /** Oldest first; the last entry is the next one to undo. */
  past: HistoryEntry[];
  /** Most recently undone first. */
  future: HistoryEntry[];
  lastKey: string | null;
  lastTime: number;
  nextId: number;
};

export type HistoryAction =
  | EditorAction
  | { type: 'UNDO' }
  | { type: 'REDO' }
  /** Jump to a point in history: `index` entries of `past` remain applied. */
  | { type: 'JUMP_TO_HISTORY'; payload: number }
  | { type: 'CLEAR_HISTORY' };

/** Actions that load a different document — history from before them no longer applies. */
const RESETTING_ACTIONS = new Set<EditorAction['type']>([
  'SET_PDF',
  'SET_OVERLAY_PDF',
  'IMPORT_PROJECT',
  'RESET_EDITOR',
]);

const takeSnapshot = (s: EditorState): Snapshot => ({
  layers: s.layers,
  objects: s.objects,
  overlayOpacity: s.overlayOpacity,
  overlayOffset: s.overlayOffset,
  autoNumbering: s.autoNumbering,
  exportSettings: s.exportSettings,
  measureCalibration: s.measureCalibration,
  lvSettings: s.lvSettings,
  cableRoutes: s.cableRoutes,
});

const snapshotChanged = (a: EditorState, b: EditorState) =>
  a.layers !== b.layers ||
  a.objects !== b.objects ||
  a.overlayOpacity !== b.overlayOpacity ||
  a.overlayOffset !== b.overlayOffset ||
  a.autoNumbering !== b.autoNumbering ||
  a.exportSettings !== b.exportSettings ||
  a.measureCalibration !== b.measureCalibration ||
  a.lvSettings !== b.lvSettings ||
  a.cableRoutes !== b.cableRoutes;

/**
 * Applies a snapshot, keeping selection / active layer consistent with the restored document.
 * Comments, photos and requests live on the server (see shared/tech-ops): undo does not bring back old ones.
 */
const applySnapshot = (s: EditorState, snap: Snapshot, selection: string[]): EditorState => {
  const current = new Map(s.objects.map(o => [o.id, o]));
  snap = { ...snap, objects: snap.objects.map(o => { const c = current.get(o.id); return c ? withServerOwned(o, c) : o; }) };
  const objectIds = new Set(snap.objects.map(o => o.id));
  const activeLayerId = snap.layers.some(l => l.id === s.activeLayerId)
    ? s.activeLayerId
    : snap.layers[0]?.id ?? null;
  return {
    ...s,
    ...snap,
    activeLayerId,
    selectedObjectIds: selection.filter(id => objectIds.has(id)),
  };
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Human-readable description of a change for the history panel. */
const describe = (action: EditorAction, prev: EditorState): string => {
  const objName = (id: string) => {
    const o = prev.objects.find(obj => obj.id === id);
    if (!o) return 'object';
    return o.name || (o.type === 'text' ? o.content?.slice(0, 20) : objectTypeName(o, prev.customIcons)) || o.type;
  };
  const layerName = (id: string) => prev.layers.find(l => l.id === id)?.name ?? 'layer';

  switch (action.type) {
    case 'ADD_FILL': return 'Fill area';
    case 'ADD_OBJECT': return `Add ${action.payload.name || objectTypeName(action.payload, prev.customIcons)}`;
    case 'DUPLICATE_OBJECT': return `Duplicate ${objName(action.payload.id)}`;
    case 'UPDATE_OBJECT': {
      const keys = Object.keys(action.payload.updates);
      const name = objName(action.payload.id);
      if (keys.includes('x') && keys.includes('width')) return `Resize ${name}`;
      if (keys.every(k => k === 'x' || k === 'y')) return `Move ${name}`;
      if (keys.length === 1 && keys[0] === 'rotation') return `Rotate ${name}`;
      if (keys.includes('status')) return `Change status of ${name}`;
      return `Edit ${name} (${keys.join(', ')})`;
    }
    case 'UPDATE_OBJECTS': return `Edit ${plural(action.payload.ids.length, 'object')} (${Object.keys(action.payload.updates).join(', ')})`;
    case 'SCALE_OBJECTS': return `Resize ${plural(action.payload.ids.length, 'object')} to ${Math.round(action.payload.factor * 100)}%`;
    case 'RENAME_OBJECTS': return `Number ${plural(Object.keys(action.payload).length, 'label')}`;
    case 'DELETE_OBJECT': return `Delete ${objName(action.payload)}`;
    case 'DELETE_OBJECTS': return action.payload.length === 1 ? `Delete ${objName(action.payload[0])}` : `Delete ${plural(action.payload.length, 'object')}`;
    case 'PASTE_OBJECT': return `Paste ${plural(prev.clipboardObjects.length, 'object')}`;
    case 'ADD_LAYER': return `Add layer ${action.payload}`;
    case 'UPDATE_LAYER': {
      const keys = Object.keys(action.payload.updates);
      if (keys.length === 1 && keys[0] === 'name') return `Rename layer to ${action.payload.updates.name}`;
      if (keys.length === 1 && keys[0] === 'locked') return `${action.payload.updates.locked ? 'Lock' : 'Unlock'} ${layerName(action.payload.id)}`;
      return `Edit ${layerName(action.payload.id)} (${keys.join(', ')})`;
    }
    case 'TOGGLE_LAYER_VISIBILITY': return `Toggle visibility of ${layerName(action.payload)}`;
    case 'DELETE_LAYER': return `Delete ${layerName(action.payload)}`;
    case 'REORDER_LAYERS': return 'Reorder layers';
    case 'SET_OVERLAY_OPACITY': return 'Change overlay opacity';
    case 'SET_OVERLAY_OFFSET': return 'Move overlay';
    case 'SET_AUTO_NUMBERING': return 'Change auto-numbering';
    case 'INCREMENT_COUNTER': return 'Increment counter';
    case 'SET_EXPORT_SETTINGS': return 'Change export settings';
    case 'SET_MEASURE_CALIBRATION': return action.payload ? `Set measuring scale (${action.payload.feet} ft)` : 'Clear measuring scale';
    case 'ADD_CUSTOM_ICON': return `Add icon ${action.payload.name}`;
    case 'DELETE_CUSTOM_ICON': return 'Delete custom icon';
    case 'SET_OBJECT_CABLES': return action.payload.ids.length === 1
      ? `Set cables of ${objName(action.payload.ids[0])}`
      : `Set cables of ${plural(action.payload.ids.length, 'object')}`;
    case 'SET_LV_SETTINGS': return 'Change cable settings';
    case 'ADD_CABLE_ROUTE': return `Draw cable route (${action.payload.points.length} points)`;
    case 'DELETE_CABLE_ROUTE': return 'Delete cable route';
    case 'SET_CABLE_ROUTE_RACK': return 'Change IDF of cable route';
    case 'APPLY_CAMERA_PLACEMENT': return `Auto-place ${plural(action.payload.cameras.length, 'camera')}`;
    case 'ADD_OBJECT_PHOTO': return `Add photo to ${objName(action.payload.id)}`;
    case 'REMOVE_OBJECT_PHOTO': return `Remove photo from ${objName(action.payload.id)}`;
    default: return action.type;
  }
};

/**
 * Key identifying "the same continuous edit" — e.g. typing into a name field, dragging
 * the rotation handle or an opacity slider. Actions with equal keys arriving within
 * COALESCE_WINDOW_MS are merged into one undo step. `null` = never merge.
 */
const coalesceKey = (action: EditorAction): string | null => {
  switch (action.type) {
    case 'UPDATE_OBJECT': {
      // A finished drag/resize is a discrete gesture — each one gets its own step.
      const keys = Object.keys(action.payload.updates);
      if (keys.includes('x') && keys.includes('y')) return null;
      return `obj:${action.payload.id}:${keys.sort().join(',')}`;
    }
    case 'UPDATE_OBJECTS':
      return `objs:${[...action.payload.ids].sort().join(',')}:${Object.keys(action.payload.updates).sort().join(',')}`;
    case 'UPDATE_LAYER':
      return `layer:${action.payload.id}:${Object.keys(action.payload.updates).sort().join(',')}`;
    case 'SET_OBJECT_CABLES':
      return `cables:${[...action.payload.ids].sort().join(',')}`;
    case 'SET_LV_SETTINGS':
    case 'SET_OVERLAY_OPACITY':
    case 'SET_OVERLAY_OFFSET':
    case 'SET_EXPORT_SETTINGS':
    case 'SET_AUTO_NUMBERING':
      return action.type;
    default:
      return null;
  }
};

/** True when an update action would only write values the target already has (e.g. a click that fires onDragStop). */
const isNoopUpdate = (action: EditorAction, prev: EditorState): boolean => {
  const unchanged = (target: object | undefined, updates: object) =>
    !!target && Object.entries(updates).every(([k, v]) => (target as Record<string, unknown>)[k] === v);
  switch (action.type) {
    case 'UPDATE_OBJECT':
      return unchanged(prev.objects.find(o => o.id === action.payload.id), action.payload.updates);
    case 'UPDATE_OBJECTS':
      return action.payload.ids.every(id => unchanged(prev.objects.find(o => o.id === id), action.payload.updates));
    case 'UPDATE_LAYER':
      return unchanged(prev.layers.find(l => l.id === action.payload.id), action.payload.updates);
    default:
      return false;
  }
};

export const createInitialHistory = (editor: EditorState): HistoryState => ({
  editor,
  past: [],
  future: [],
  lastKey: null,
  lastTime: 0,
  nextId: 1,
});

export const withHistory = (reducer: (s: EditorState, a: EditorAction) => EditorState) => {
  const historyReducer = (state: HistoryState, action: HistoryAction): HistoryState => {
    switch (action.type) {
      case 'UNDO': {
        const entry = state.past[state.past.length - 1];
        if (!entry) return state;
        const redoEntry: HistoryEntry = {
          ...entry,
          before: takeSnapshot(state.editor),
          selectionBefore: state.editor.selectedObjectIds,
        };
        return {
          ...state,
          editor: applySnapshot(state.editor, entry.before, entry.selectionBefore),
          past: state.past.slice(0, -1),
          future: [redoEntry, ...state.future],
          lastKey: null,
        };
      }
      case 'REDO': {
        const entry = state.future[0];
        if (!entry) return state;
        const undoEntry: HistoryEntry = {
          ...entry,
          before: takeSnapshot(state.editor),
          selectionBefore: state.editor.selectedObjectIds,
        };
        return {
          ...state,
          editor: applySnapshot(state.editor, entry.before, entry.selectionBefore),
          past: [...state.past, undoEntry],
          future: state.future.slice(1),
          lastKey: null,
        };
      }
      case 'JUMP_TO_HISTORY': {
        const target = Math.max(0, Math.min(action.payload, state.past.length + state.future.length));
        let next = state;
        while (next.past.length > target) next = historyReducer(next, { type: 'UNDO' });
        while (next.past.length < target && next.future.length > 0) next = historyReducer(next, { type: 'REDO' });
        return next;
      }
      case 'CLEAR_HISTORY':
        return createInitialHistory(state.editor);
    }

    const prev = state.editor;
    if (isNoopUpdate(action, prev)) return state;
    const editor = reducer(prev, action);
    if (editor === prev) return state;

    if (RESETTING_ACTIONS.has(action.type)) {
      return createInitialHistory(editor);
    }

    // UI-only changes (selection, zoom, tool…) and changes from the server are not recorded.
    if (!snapshotChanged(prev, editor) || action.type === 'APPLY_REMOTE') {
      return { ...state, editor };
    }

    const now = Date.now();
    const key = coalesceKey(action);
    const last = state.past[state.past.length - 1];
    const withinWindow = now - state.lastTime < COALESCE_WINDOW_MS;

    // Merge into the previous step: continuous edits of the same thing, or the counter bump
    // that the stamp tool dispatches right after placing an object.
    const merge = last && withinWindow && (
      (key !== null && key === state.lastKey) ||
      action.type === 'INCREMENT_COUNTER'
    );

    if (merge) {
      return { ...state, editor, future: [], lastTime: now };
    }

    const entry: HistoryEntry = {
      id: state.nextId,
      label: describe(action, prev),
      timestamp: now,
      before: takeSnapshot(prev),
      selectionBefore: prev.selectedObjectIds,
    };

    return {
      editor,
      past: [...state.past, entry].slice(-HISTORY_LIMIT),
      future: [],
      lastKey: key,
      lastTime: now,
      nextId: state.nextId + 1,
    };
  };
  return historyReducer;
};
