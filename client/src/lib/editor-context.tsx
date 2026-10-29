import React, {createContext, ReactNode, useContext, useEffect, useMemo, useReducer} from 'react';
import {DocumentState, EditorAction, EditorObject, EditorState, Layer, UIState} from './types';
import {v4 as uuidv4} from 'uuid';
import {CANVAS_BASE_HEIGHT, CANVAS_BASE_WIDTH} from '@/core/constants';
import {createInitialHistory, HistoryAction, HistoryEntry, withHistory} from './history';
import {DEFAULT_LV_SETTINGS, deviceKey, normalizeLvSettings} from '@/core/lv-icons';
import {assignDroppedCameras, isCamera, isCoverageArea} from '@/core/camera-coverage';

/** Every paint-bucket fill lands in this layer. */
export const FILL_LAYER_NAME = 'Colors';

/** Every coverage area lands in this layer, whichever layer is active. */
export const COVERAGE_AREA_LAYER_NAME = 'CoverageAreas';

/**
 * The coverage-area layer, created on top when missing and made visible so a new area shows.
 * Returns the (possibly extended) layer list and the layer id.
 */
const coverageAreaLayer = (layers: Layer[]): { layers: Layer[]; layerId: string } => {
  const layer = layers.find(l => l.name.trim().toLowerCase() === COVERAGE_AREA_LAYER_NAME.toLowerCase());
  if (!layer) {
    const id = uuidv4();
    const maxOrder = Math.max(...layers.map(l => l.order), -1);
    return {
      layers: [...layers, { id, name: COVERAGE_AREA_LAYER_NAME, visible: true, locked: false, order: maxOrder + 1, opacity: 1 }],
      layerId: id,
    };
  }
  return {
    layers: layer.visible ? layers : layers.map(l => l.id === layer.id ? { ...l, visible: true } : l),
    layerId: layer.id,
  };
};

/** Two fills whose bounds differ by less than this (canvas units) are the same area. */
const SAME_FILL_EPSILON = 0.5;

/** Maximum manual overlay shift (unscaled canvas units) — keeps the overlay reachable on screen. */
const MAX_OVERLAY_OFFSET = CANVAS_BASE_WIDTH;

/** Rounds to 0.1 canvas unit — hand dragging at high zoom needs finer steps than whole units. */
const clampOverlayCoord = (v: number) =>
  Math.min(MAX_OVERLAY_OFFSET, Math.max(-MAX_OVERLAY_OFFSET, Math.round(v * 10) / 10 || 0));

/** Gap (unscaled canvas units) between an object and its clone. */
const DUPLICATE_GAP = 4;
/** Smallest width / height a bulk resize leaves (canvas units). */
const MIN_OBJECT_SIZE = 2;

/** "CAM 7" → "CAM 8", "P-09" → "P-10"; unchanged without a trailing number. Skips labels already in use. */
const nextFreeLabel = (name: string, taken: Set<string>) => {
  const match = name.match(/^(.*?)(\d+)(\D*)$/);
  if (!match) return name;
  const [, prefix, digits, suffix] = match;
  let n = parseInt(digits, 10);
  let label: string;
  do {
    n += 1;
    label = `${prefix}${String(n).padStart(digits.length, '0')}${suffix}`;
  } while (taken.has(label));
  return label;
};

/** Marking an object RELOCATE remembers where it stands (once); any other change value forgets it. */
const applyObjectUpdates = (o: EditorObject, updates: Partial<EditorObject>): EditorObject => {
  const next = { ...o, ...updates };
  if (!('change' in updates) || 'changeOrigin' in updates) return next;
  if (updates.change === 'RELOCATE') {
    if (!o.changeOrigin) next.changeOrigin = { x: o.x, y: o.y };
  } else {
    delete next.changeOrigin;
  }
  return next;
};

const clampOverlayOffset = (offset: { x: number; y: number }) => ({
  x: clampOverlayCoord(offset.x),
  y: clampOverlayCoord(offset.y),
});

const IPAD_MODE_STORAGE_KEY = 'editor.ipadMode';

/** Touch layout: saved choice, or on by default on touch-first devices (iPad, tablets). */
const loadIpadMode = (): boolean => {
  try {
    const saved = localStorage.getItem(IPAD_MODE_STORAGE_KEY);
    if (saved !== null) return saved === 'true';
  } catch { /* storage unavailable */ }
  if (typeof window === 'undefined' || navigator.maxTouchPoints === 0) return false;
  // iPadOS Safari identifies itself as a Mac ("desktop website" mode) — a touch-capable "Mac" is an iPad.
  const isIpad = /iPad|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
  return isIpad || window.matchMedia('(pointer: coarse)').matches;
};

const saveIpadMode = (value: boolean) => {
  try { localStorage.setItem(IPAD_MODE_STORAGE_KEY, String(value)); } catch { /* storage unavailable */ }
};

const STYLUS_ONLY_STORAGE_KEY = 'editor.stylusOnly';

/** Off unless the user chose it — a tablet without a stylus must never end up with fingers that can't draw. */
const loadStylusOnly = (): boolean => {
  try { return localStorage.getItem(STYLUS_ONLY_STORAGE_KEY) === 'true'; } catch { return false; }
};

const saveStylusOnly = (value: boolean) => {
  try { localStorage.setItem(STYLUS_ONLY_STORAGE_KEY, String(value)); } catch { /* storage unavailable */ }
};

const CAMERA_COVERAGE_STORAGE_KEY = 'editor.showCameraCoverage';

const loadCameraCoverage = (): boolean => {
  try { return localStorage.getItem(CAMERA_COVERAGE_STORAGE_KEY) === 'true'; } catch { return false; }
};

const saveCameraCoverage = (value: boolean) => {
  try { localStorage.setItem(CAMERA_COVERAGE_STORAGE_KEY, String(value)); } catch { /* storage unavailable */ }
};

const MOUNT_HEIGHTS_STORAGE_KEY = 'editor.showMountHeights';

const loadMountHeights = (): boolean => {
  try { return localStorage.getItem(MOUNT_HEIGHTS_STORAGE_KEY) === 'true'; } catch { return false; }
};

const saveMountHeights = (value: boolean) => {
  try { localStorage.setItem(MOUNT_HEIGHTS_STORAGE_KEY, String(value)); } catch { /* storage unavailable */ }
};

const COVERAGE_SOLID_STORAGE_KEY = 'editor.coverageSolid';

const loadCoverageSolid = (): boolean => {
  try { return localStorage.getItem(COVERAGE_SOLID_STORAGE_KEY) === 'true'; } catch { return false; }
};

const saveCoverageSolid = (value: boolean) => {
  try { localStorage.setItem(COVERAGE_SOLID_STORAGE_KEY, String(value)); } catch { /* storage unavailable */ }
};

const SNAP_STORAGE_KEY = 'editor.snapEnabled';

const loadSnapEnabled = (): boolean => {
  try { return localStorage.getItem(SNAP_STORAGE_KEY) !== 'false'; } catch { return true; }
};

const saveSnapEnabled = (value: boolean) => {
  try { localStorage.setItem(SNAP_STORAGE_KEY, String(value)); } catch { /* storage unavailable */ }
};

const initialDocumentState: DocumentState = {
  projectId: null,
  pdfFileId: null,
  overlayPdfFileId: null,
  pdfFile: null,
  overlayPdfFile: null,
  overlayOpacity: 0.5,
  overlayOffset: { x: 0, y: 0 },
  layers: [],
  objects: [],
  clipboardObjects: [],
  autoNumbering: {
    enabled: false,
    prefix: 'IDF1-P1-',
    counter: 1,
    template: null
  },
  exportSettings: {
    labelFontSize: 1
  },
  customIcons: [],
  pdfCanvasHeight: CANVAS_BASE_HEIGHT,
  measureCalibration: null,
  lvSettings: DEFAULT_LV_SETTINGS,
  cableRoutes: []
};

const initialUIState: UIState = {
  selectedObjectIds: [],
  activeLayerId: null,
  currentPage: 1,
  scale: 4.1,
  scrollPos: { x: 0, y: 0 },
  tool: 'select',
  showStatusColors: false,
  showCableRoutes: true,
  selectedRouteId: null,
  routeRackId: null,
  cableSummaryOpen: false,
  objectDetailsOpen: false,
  isImporting: false,
  exportStep: 'closed',
  placement: null,
  fillColor: '#3b82f6',
  fillOpacity: 0.35,
  drawColor: '#000000',
  drawStrokeWidth: 2,
  drawStraight: false,
  wallStraight: true,
  wallSnap: true,
  ipadMode: loadIpadMode(),
  stylusOnly: loadStylusOnly(),
  showCameraCoverage: loadCameraCoverage(),
  coverageSolid: loadCoverageSolid(),
  showMountHeights: loadMountHeights(),
  measureTape: null,
  snapEnabled: loadSnapEnabled()
};

const initialState: EditorState = {
  ...initialDocumentState,
  ...initialUIState
};

const baseReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'SET_PROJECT_ID':
      return { ...state, projectId: action.payload };
    case 'SET_PDF_FILE_IDS':
      return { 
        ...state, 
        pdfFileId: action.payload.pdfFileId, 
        overlayPdfFileId: action.payload.overlayPdfFileId 
      };
    case 'SET_PDF':
      const defaultLayerId = uuidv4();
      return {
        ...state,
        pdfFile: action.payload,
        layers: [{ id: defaultLayerId, name: 'Layer 1', visible: true, locked: false, order: 0, opacity: 1 }],
        activeLayerId: defaultLayerId,
        objects: [],
        cableRoutes: [],
        selectedRouteId: null,
        currentPage: 1,
        pdfCanvasHeight: CANVAS_BASE_HEIGHT,
        measureCalibration: null,
        measureTape: null,
      };
    case 'REPLACE_PDF':
      return {
        ...state,
        pdfFile: action.payload.file,
        pdfFileId: action.payload.fileId,
        // The new file may have fewer pages.
        currentPage: 1,
      };
    case 'SET_PDF_DIMENSIONS':
      return {
        ...state,
        pdfCanvasHeight: Math.round(CANVAS_BASE_WIDTH * action.payload.height / action.payload.width)
      };
    case 'SET_OVERLAY_PDF':
      return {
        ...state,
        overlayPdfFile: action.payload,
        // A new or removed overlay is not the stored file any more — otherwise reopening the project
        // loads the previous overlay. The new one is uploaded by useAutoSave, which sets its id.
        // Loading a project sets the id (and alignment) right after this action.
        overlayPdfFileId: null,
        // The alignment belonged to the previous overlay.
        overlayOffset: { x: 0, y: 0 },
        tool: action.payload === null && state.tool === 'pan-overlay' ? 'select' : state.tool,
      };
    case 'SET_OVERLAY_OPACITY':
      return { ...state, overlayOpacity: action.payload };
    case 'SET_OVERLAY_OFFSET':
      return { ...state, overlayOffset: clampOverlayOffset(action.payload) };
    case 'ADD_LAYER':
      const newLayerId = uuidv4();
      const maxOrder = Math.max(...state.layers.map((l) => l.order), -1);
      return {
        ...state,
        layers: [
          ...state.layers,
          { id: newLayerId, name: action.payload, visible: true, locked: false, order: maxOrder + 1, opacity: 1 },
        ],
        activeLayerId: newLayerId,
      };
    case 'UPDATE_LAYER':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.payload.id ? { ...l, ...action.payload.updates } : l
        ),
      };
    case 'TOGGLE_LAYER_VISIBILITY':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.payload ? { ...l, visible: !l.visible } : l
        ),
      };
    case 'SELECT_LAYER':
    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayerId: action.payload };
    case 'DELETE_LAYER': {
      const layerId = action.payload;
      const remainingLayers = state.layers.filter(l => l.id !== layerId);
      const remainingObjects = state.objects.filter(o => o.layerId !== layerId);
      
      let newActiveLayerId = state.activeLayerId;
      if (state.activeLayerId === layerId) {
        newActiveLayerId = remainingLayers.length > 0 ? remainingLayers[0].id : null;
      }
      
      const newSelectedObjectIds = state.selectedObjectIds.filter(id => {
         const obj = state.objects.find(o => o.id === id);
         return obj && obj.layerId !== layerId;
      });

      return {
        ...state,
        layers: remainingLayers,
        objects: remainingObjects,
        activeLayerId: newActiveLayerId,
        selectedObjectIds: newSelectedObjectIds
      };
    }
    case 'ADD_OBJECT': {
      if (isCoverageArea(action.payload)) {
        const { layers, layerId } = coverageAreaLayer(state.layers);
        return { ...state, layers, objects: [...state.objects, { ...action.payload, layerId }] };
      }
      // Every way of placing a device (icon button, stamp, library) gets its type's cables.
      const key = action.payload.cables ? null : deviceKey(action.payload);
      const defaults = key ? state.lvSettings.cableDefaults[key] : undefined;
      let object = defaults ? { ...action.payload, cables: defaults.map(c => ({ ...c })) } : action.payload;
      // … and the size of that device type already on the plan (latest placed), centred where it was put.
      // The first icon of a type takes the size of the latest icon of any type: the default size is
      // per zoom level, so an icon added at another zoom would be out of proportion with the plan.
      const sizeKey = deviceKey(action.payload);
      const placed = [...state.objects].reverse().filter(o => !o.isFill);
      const same = sizeKey
        ? placed.find(o => deviceKey(o) === sizeKey) ?? (action.payload.type === 'icon' ? placed.find(o => o.type === 'icon') : undefined)
        : undefined;
      if (same && (same.width !== object.width || same.height !== object.height)) {
        object = {
          ...object,
          x: object.x + (object.width - same.width) / 2, y: object.y + (object.height - same.height) / 2,
          width: same.width, height: same.height,
        };
      }
      return { ...state, objects: [...state.objects, object] };
    }
    case 'DUPLICATE_OBJECT': {
      const source = state.objects.find(o => o.id === action.payload.id);
      if (!source || source.isFill || source.type === 'path') return state;
      // Same device settings as copy / paste: no photos, comments or notes of the original.
      const {
        photos, comments, notes, issueDescription, statusUpdatedAt, statusUpdatedBy,
        change, changeOrigin, changeNote, changeUpdatedAt, changeUpdatedBy, ...rest
      } = source;
      // Right of the original; to its left / below when that runs off the page.
      let x = source.x + source.width + DUPLICATE_GAP;
      let y = source.y;
      if (x + source.width > CANVAS_BASE_WIDTH) {
        x = source.x - source.width - DUPLICATE_GAP;
        if (x < 0) { x = source.x; y = Math.min(source.y + source.height + DUPLICATE_GAP, state.pdfCanvasHeight - source.height); }
      }
      const taken = new Set(state.objects.map(o => o.name).filter((n): n is string => !!n));
      const clone = {
        ...rest,
        id: action.payload.newId,
        x,
        y,
        name: source.name ? nextFreeLabel(source.name, taken) : source.name,
        metadata: source.metadata ? { ...source.metadata } : undefined,
        labelOffset: source.labelOffset ? { ...source.labelOffset } : undefined,
      };
      return { ...state, objects: [...state.objects, clone], selectedObjectIds: [clone.id] };
    }
    case 'UPDATE_OBJECT':
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.payload.id ? applyObjectUpdates(o, action.payload.updates) : o
        ),
      };
    case 'UPDATE_OBJECTS':
      return {
        ...state,
        objects: state.objects.map((o) =>
          action.payload.ids.includes(o.id) ? applyObjectUpdates(o, action.payload.updates) : o
        ),
      };
    case 'SCALE_OBJECTS': {
      const { ids, factor } = action.payload;
      if (!(factor > 0) || factor === 1) return state;
      return {
        ...state,
        objects: state.objects.map((o) => {
          // Fills and drawings are shapes of the plan itself, not placed objects.
          if (!ids.includes(o.id) || o.isFill || o.type === 'path') return o;
          const width = Math.max(MIN_OBJECT_SIZE, o.width * factor);
          const height = Math.max(MIN_OBJECT_SIZE, o.height * factor);
          return {
            ...o,
            x: o.x + (o.width - width) / 2,
            y: o.y + (o.height - height) / 2,
            width,
            height,
            ...(o.fontSize ? { fontSize: o.fontSize * (width / o.width) } : {}),
          };
        }),
      };
    }
    case 'RENAME_OBJECTS':
      return {
        ...state,
        objects: state.objects.map((o) => (o.id in action.payload ? { ...o, name: action.payload[o.id] } : o)),
      };
    case 'DELETE_OBJECT':
      return {
        ...state,
        objects: state.objects.filter((o) => o.id !== action.payload),
        selectedObjectIds: state.selectedObjectIds.filter(id => id !== action.payload),
      };
    case 'DELETE_OBJECTS':
      return {
        ...state,
        objects: state.objects.filter((o) => !action.payload.includes(o.id)),
        selectedObjectIds: state.selectedObjectIds.filter(id => !action.payload.includes(id)),
      };
    case 'SELECT_OBJECT':
      return { 
        ...state, 
        selectedObjectIds: action.payload ? [action.payload] : [],
        selectedRouteId: null,
        objectDetailsOpen: action.payload ? state.objectDetailsOpen : false
      };
    case 'TOGGLE_OBJECT_SELECTION':
      return {
        ...state,
        selectedObjectIds: state.selectedObjectIds.includes(action.payload)
          ? state.selectedObjectIds.filter(id => id !== action.payload)
          : [...state.selectedObjectIds, action.payload]
      };
    case 'SET_SELECTION':
      return { ...state, selectedObjectIds: action.payload };
    case 'SET_TOOL':
      return { ...state, tool: action.payload, selectedObjectIds: [], selectedRouteId: null };
    case 'OPEN_OBJECT_DETAILS':
      return { ...state, objectDetailsOpen: true };
    case 'CLOSE_OBJECT_DETAILS':
      return { ...state, objectDetailsOpen: false };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_SCALE':
      return { ...state, scale: action.payload };
    case 'SET_SCROLL':
      return { ...state, scrollPos: action.payload };
    case 'IMPORT_PROJECT': {
      // Older project states may not contain an active layer. Without normalising it, drawing and
      // object creation silently return even though the project has valid layers.
      const layers = action.payload.layers ?? state.layers;
      const requestedLayerId = action.payload.activeLayerId ?? state.activeLayerId;
      const activeLayerId = requestedLayerId && layers.some(layer => layer.id === requestedLayerId)
        ? requestedLayerId
        : layers[0]?.id ?? null;
      return {
        ...state, measureCalibration: null, measureTape: null, ...action.payload, layers, activeLayerId,
        lvSettings: normalizeLvSettings(action.payload.lvSettings),
        cableRoutes: action.payload.cableRoutes ?? [],
        selectedRouteId: null,
      };
    }
    case 'ADD_CABLE_ROUTE':
      return { ...state, cableRoutes: [...state.cableRoutes, action.payload] };
    case 'DELETE_CABLE_ROUTE':
      return {
        ...state,
        cableRoutes: state.cableRoutes.filter(r => r.id !== action.payload),
        selectedRouteId: state.selectedRouteId === action.payload ? null : state.selectedRouteId,
      };
    case 'SET_CABLE_ROUTE_RACK':
      return {
        ...state,
        cableRoutes: state.cableRoutes.map(r => r.id === action.payload.id ? { ...r, rackId: action.payload.rackId } : r),
      };
    case 'SET_ROUTE_RACK':
      return { ...state, routeRackId: action.payload };
    case 'SELECT_CABLE_ROUTE':
      return { ...state, selectedRouteId: action.payload, selectedObjectIds: action.payload ? [] : state.selectedObjectIds };
    case 'TOGGLE_CABLE_ROUTES':
      return { ...state, showCableRoutes: !state.showCableRoutes };
    case 'TOGGLE_CAMERA_COVERAGE':
      return { ...state, showCameraCoverage: !state.showCameraCoverage };
    case 'TOGGLE_COVERAGE_SOLID':
      return { ...state, coverageSolid: !state.coverageSolid };
    case 'TOGGLE_MOUNT_HEIGHTS':
      return { ...state, showMountHeights: !state.showMountHeights };
    case 'SET_CABLE_SUMMARY_OPEN':
      return { ...state, cableSummaryOpen: action.payload };
    case 'SET_MEASURE_CALIBRATION':
      return { ...state, measureCalibration: action.payload };
    case 'SET_OBJECT_CABLES': {
      const { ids, cables } = action.payload;
      const cableDefaults = { ...state.lvSettings.cableDefaults };
      const objects = state.objects.map(o => {
        if (!ids.includes(o.id)) return o;
        const key = deviceKey(o);
        if (key) cableDefaults[key] = cables;
        return { ...o, cables };
      });
      return { ...state, objects, lvSettings: { ...state.lvSettings, cableDefaults } };
    }
    case 'SET_LV_SETTINGS':
      return { ...state, lvSettings: { ...state.lvSettings, ...action.payload } };
    case 'REORDER_LAYERS': {
      const { sourceIndex, destinationIndex } = action.payload;
      const result = Array.from(state.layers);
      const [removed] = result.splice(sourceIndex, 1);
      result.splice(destinationIndex, 0, removed);
      return { ...state, layers: result };
    }
    case 'COPY_OBJECT': {
      if (state.selectedObjectIds.length === 0) return state;
      const objectsToCopy = state.objects.filter(o => state.selectedObjectIds.includes(o.id));
      if (objectsToCopy.length === 0) return state;

      // Copy only basic parameters: name, color, dimensions (width/height), label (content), device type (type/metadata), status
      // Explicitly exclude photos/gallery
      const cleanedObjects = objectsToCopy.map(o => ({
        id: o.id, // placeholder
        type: o.type,
        x: o.x,
        y: o.y,
        width: o.width,
        height: o.height,
        layerId: o.layerId, // placeholder
        name: o.name,
        labelPosition: o.labelPosition,
        labelOffset: o.labelOffset ? { ...o.labelOffset } : undefined,
        content: o.content,
        color: o.color,
        status: o.status,
        metadata: o.metadata ? { ...o.metadata } : undefined,
        cables: o.cables,
        strokeWidth: o.strokeWidth,
        fontSize: o.fontSize,
        fontWeight: o.fontWeight,
        opacity: o.opacity,
        rotation: o.rotation,
        pathData: o.pathData,
        // photos is EXCLUDED
      }));

      return { ...state, clipboardObjects: cleanedObjects as EditorObject[] };
    }
    case 'PASTE_OBJECT': {
      if (state.clipboardObjects.length === 0) {
        return state;
      }
      
      // Default to active layer, or first layer if none active
      const activeLayerId = state.activeLayerId || (state.layers.length > 0 ? state.layers[0].id : null);
      if (!activeLayerId) {
        return state;
      }
      
      const incrementString = (str: string) => {
        const match = str.match(/^(.*?)(\d+)([^\d]*)$/);
        if (!match) {
          return str;
        }
        
        const prefix = match[1];
        const numStr = match[2];
        const suffix = match[3];
        
        const nextNum = parseInt(numStr, 10) + 1;
        const nextNumStr = nextNum.toString().padStart(numStr.length, '0');
        
        const result = `${prefix}${nextNumStr}${suffix}`;
        return result;
      };

      // Calculate the center of the group
      const minX = Math.min(...state.clipboardObjects.map(obj => obj.x));
      const minY = Math.min(...state.clipboardObjects.map(obj => obj.y));
      const maxX = Math.max(...state.clipboardObjects.map(obj => obj.x + (obj.width || 0)));
      const maxY = Math.max(...state.clipboardObjects.map(obj => obj.y + (obj.height || 0)));
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;


      const newObjects = state.clipboardObjects.map((o) => {
        const id = uuidv4();
        let x = o.x;
        let y = o.y;

        if (action.payload && action.payload.x !== undefined && action.payload.y !== undefined) {
          const offsetX = o.x - centerX;
          const offsetY = o.y - centerY;
          x = action.payload.x + offsetX;
          y = action.payload.y + offsetY;
        } else {
          const offset = 20 / (state.scale || 1);
          x += offset;
          y += offset;
        }

        let content = o.content;
        let name = o.name;

        if (action.payload?.isIncremental) {
          if (o.type === 'text' && content) {
            content = incrementString(content);
          } else if (o.type !== 'text' && name) {
            name = incrementString(name);
          }
        }

        return {
          ...o,
          id,
          x,
          y,
          layerId: activeLayerId,
          content,
          name,
          photos: []
        };
      });

      // Pasted coverage areas go to their own layer too.
      let layers = state.layers;
      if (newObjects.some(isCoverageArea)) {
        const target = coverageAreaLayer(layers);
        layers = target.layers;
        for (const o of newObjects) if (isCoverageArea(o)) o.layerId = target.layerId;
      }

      return {
        ...state,
        layers,
        objects: [...state.objects, ...newObjects],
        selectedObjectIds: newObjects.map(o => o.id),
        clipboardObjects: newObjects
      };
    }
    case 'SET_AUTO_NUMBERING':
      return {
        ...state,
        autoNumbering: { ...state.autoNumbering, ...action.payload }
      };
    case 'INCREMENT_COUNTER':
      return {
        ...state,
        autoNumbering: { ...state.autoNumbering, counter: state.autoNumbering.counter + 1 }
      };
    case 'SET_EXPORT_SETTINGS':
      return {
        ...state,
        exportSettings: { ...state.exportSettings, ...action.payload }
      };
    case 'ADD_CUSTOM_ICON':
      return {
        ...state,
        customIcons: [...state.customIcons, action.payload]
      };
    case 'DELETE_CUSTOM_ICON':
      return {
        ...state,
        customIcons: state.customIcons.filter(icon => icon.id !== action.payload)
      };
    case 'CLEAR_CUSTOM_ICONS':
      return {
        ...state,
        customIcons: []
      };
    case 'ADD_OBJECT_PHOTO':
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.payload.id
            ? { ...o, photos: [...(o.photos || []), action.payload.photoDataUrl] }
            : o
        ),
      };
    case 'REMOVE_OBJECT_PHOTO':
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.payload.id
            ? { ...o, photos: (o.photos || []).filter((_, i) => i !== action.payload.index) }
            : o
        ),
      };
    case 'TOGGLE_STATUS_COLORS':
      return { ...state, showStatusColors: !state.showStatusColors };
    case 'SET_IMPORTING':
      return { ...state, isImporting: action.payload };
    case 'SET_EXPORT_STEP':
      return { ...state, exportStep: action.payload };
    case 'SET_PLACEMENT':
      return { ...state, placement: action.payload };
    case 'APPLY_CAMERA_PLACEMENT': {
      const { cameras, areaCameras, removeIds } = action.payload;
      const removed = new Set(removeIds);
      const objects = state.objects
        .filter(o => !removed.has(o.id))
        .map(o => {
          if (areaCameras[o.id]) return { ...o, coverageCameraIds: areaCameras[o.id] };
          // Other areas must not keep pointing at removed cameras.
          if (removed.size && o.coverageCameraIds?.some(id => removed.has(id))) {
            const ids = o.coverageCameraIds.filter(id => !removed.has(id));
            return { ...o, coverageCameraIds: ids.length ? ids : undefined };
          }
          return o;
        });
      return {
        ...state,
        objects: [...objects, ...cameras],
        placement: null,
        selectedObjectIds: cameras.map(c => c.id),
      };
    }
    case 'SET_FILL_SETTINGS':
    case 'SET_WALL_SETTINGS':
      return { ...state, ...action.payload };
    case 'SET_DRAW_SETTINGS':
      return { ...state, ...action.payload };
    case 'SET_IPAD_MODE':
      return { ...state, ipadMode: action.payload };
    case 'SET_STYLUS_ONLY':
      return { ...state, stylusOnly: action.payload };
    case 'SET_MEASURE_TAPE':
      return { ...state, measureTape: action.payload };
    case 'SET_SNAP_ENABLED':
      return { ...state, snapEnabled: action.payload };
    case 'ADD_FILL': {
      const { object, newLayerId } = action.payload;
      let layers = state.layers;
      let layer = layers.find(l => l.name.trim().toLowerCase() === FILL_LAYER_NAME.toLowerCase());
      if (!layer) {
        // Lowest order so fills sit underneath everything else in the exported PDF.
        const minOrder = Math.min(...layers.map(l => l.order), 0);
        layer = { id: newLayerId, name: FILL_LAYER_NAME, visible: true, locked: false, order: minOrder - 1, opacity: 1 };
        layers = [...layers, layer];
      } else if (!layer.visible) {
        layers = layers.map(l => l.id === layer!.id ? { ...l, visible: true } : l);
      }
      const layerId = layer.id;
      const same = state.objects.find(o =>
        o.isFill && o.layerId === layerId &&
        Math.abs(o.x - object.x) < SAME_FILL_EPSILON &&
        Math.abs(o.y - object.y) < SAME_FILL_EPSILON &&
        Math.abs(o.width - object.width) < SAME_FILL_EPSILON &&
        Math.abs(o.height - object.height) < SAME_FILL_EPSILON
      );
      const objects = same
        ? state.objects.map(o => o.id === same.id
            ? { ...o, content: object.content, color: object.color, opacity: object.opacity }
            : o)
        : [...state.objects, { ...object, layerId }];
      return { ...state, layers, objects };
    }
    case 'RESET_EDITOR':
      return { ...state, ...initialDocumentState, measureTape: null, tool: state.tool === 'pan-overlay' ? 'select' : state.tool };
    default:
      return state;
  }
};

/** Actions that place or move objects: a camera dropped into a coverage area gets assigned to it. */
const PLACING_ACTIONS = new Set<EditorAction['type']>(['ADD_OBJECT', 'DUPLICATE_OBJECT', 'PASTE_OBJECT', 'UPDATE_OBJECT', 'UPDATE_OBJECTS']);

const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  const next = baseReducer(state, action);
  if (next.objects === state.objects || !PLACING_ACTIONS.has(action.type)) return next;
  const before = new Map(state.objects.map(o => [o.id, o]));
  const placed = next.objects
    .filter(o => {
      const old = before.get(o.id);
      return isCamera(o) && (!old || old.x !== o.x || old.y !== o.y);
    })
    .map(o => o.id);
  if (!placed.length) return next;
  const visible = new Set(next.layers.filter(l => l.visible).map(l => l.id));
  const objects = assignDroppedCameras(next.objects, placed, visible);
  return objects === next.objects ? next : { ...next, objects };
};

const historyReducer = withHistory(editorReducer);

export type HistoryInfo = {
  /** Applied changes, oldest first. */
  past: HistoryEntry[];
  /** Undone changes that can be redone, most recently undone first. */
  future: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
};

export const DocumentStateContext = createContext<DocumentState | null>(null);
export const DocumentDispatchContext = createContext<React.Dispatch<HistoryAction> | null>(null);
export const UIStateContext = createContext<UIState | null>(null);
export const UIDispatchContext = createContext<React.Dispatch<HistoryAction> | null>(null);
export const HistoryContext = createContext<HistoryInfo | null>(null);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [historyState, dispatch] = useReducer(historyReducer, initialState, createInitialHistory);
  const state = historyState.editor;

  useEffect(() => saveIpadMode(state.ipadMode), [state.ipadMode]);
  useEffect(() => saveStylusOnly(state.stylusOnly), [state.stylusOnly]);
  useEffect(() => saveCameraCoverage(state.showCameraCoverage), [state.showCameraCoverage]);
  useEffect(() => saveCoverageSolid(state.coverageSolid), [state.coverageSolid]);
  useEffect(() => saveMountHeights(state.showMountHeights), [state.showMountHeights]);
  useEffect(() => saveSnapEnabled(state.snapEnabled), [state.snapEnabled]);
  useEffect(() => {
    if (state.layers.length === 0 || state.layers.some(layer => layer.id === state.activeLayerId)) return;
    dispatch({ type: 'SET_ACTIVE_LAYER', payload: state.layers[0].id });
  }, [state.activeLayerId, state.layers, dispatch]);

  const historyInfo = useMemo<HistoryInfo>(() => ({
    past: historyState.past,
    future: historyState.future,
    canUndo: historyState.past.length > 0,
    canRedo: historyState.future.length > 0,
  }), [historyState.past, historyState.future]);

  const documentState = useMemo(() => ({
    projectId: state.projectId,
    pdfFileId: state.pdfFileId,
    overlayPdfFileId: state.overlayPdfFileId,
    pdfFile: state.pdfFile,
    overlayPdfFile: state.overlayPdfFile,
    overlayOpacity: state.overlayOpacity,
    overlayOffset: state.overlayOffset,
    layers: state.layers,
    objects: state.objects,
    clipboardObjects: state.clipboardObjects,
    autoNumbering: state.autoNumbering,
    exportSettings: state.exportSettings,
    customIcons: state.customIcons,
    pdfCanvasHeight: state.pdfCanvasHeight,
    measureCalibration: state.measureCalibration,
    lvSettings: state.lvSettings,
    cableRoutes: state.cableRoutes,
  }), [state.measureCalibration, state.lvSettings, state.cableRoutes, state.projectId, state.pdfFileId, state.overlayPdfFileId, state.pdfFile, state.overlayPdfFile, state.overlayOpacity, state.overlayOffset, state.layers, state.objects, state.clipboardObjects, state.autoNumbering, state.exportSettings, state.customIcons, state.pdfCanvasHeight]);

  const uiState = useMemo(() => ({
    selectedObjectIds: state.selectedObjectIds,
    activeLayerId: state.activeLayerId,
    currentPage: state.currentPage,
    scale: state.scale,
    scrollPos: state.scrollPos,
    tool: state.tool,
    showStatusColors: state.showStatusColors,
    showCableRoutes: state.showCableRoutes,
    showCameraCoverage: state.showCameraCoverage,
    coverageSolid: state.coverageSolid,
    showMountHeights: state.showMountHeights,
    selectedRouteId: state.selectedRouteId,
    routeRackId: state.routeRackId,
    cableSummaryOpen: state.cableSummaryOpen,
    objectDetailsOpen: state.objectDetailsOpen,
    isImporting: state.isImporting,
    exportStep: state.exportStep,
    placement: state.placement,
    fillColor: state.fillColor,
    fillOpacity: state.fillOpacity,
    drawColor: state.drawColor,
    drawStrokeWidth: state.drawStrokeWidth,
    drawStraight: state.drawStraight,
    wallStraight: state.wallStraight,
    wallSnap: state.wallSnap,
    ipadMode: state.ipadMode,
    stylusOnly: state.stylusOnly,
    measureTape: state.measureTape,
    snapEnabled: state.snapEnabled,
  }), [state.measureTape, state.snapEnabled, state.fillColor, state.fillOpacity, state.drawColor, state.drawStrokeWidth, state.drawStraight, state.ipadMode, state.stylusOnly, state.selectedObjectIds, state.activeLayerId, state.currentPage, state.scale, state.scrollPos, state.tool, state.showStatusColors, state.showCableRoutes, state.showCameraCoverage, state.coverageSolid, state.showMountHeights, state.selectedRouteId, state.routeRackId, state.cableSummaryOpen, state.objectDetailsOpen, state.isImporting, state.exportStep, state.placement, state.wallStraight, state.wallSnap]);

  return (
    <DocumentStateContext.Provider value={documentState}>
      <DocumentDispatchContext.Provider value={dispatch}>
        <UIStateContext.Provider value={uiState}>
          <UIDispatchContext.Provider value={dispatch}>
            <HistoryContext.Provider value={historyInfo}>
              {children}
            </HistoryContext.Provider>
          </UIDispatchContext.Provider>
        </UIStateContext.Provider>
      </DocumentDispatchContext.Provider>
    </DocumentStateContext.Provider>
  );
};

export const useDocument = () => {
  const state = useContext(DocumentStateContext);
  const dispatch = useContext(DocumentDispatchContext);
  if (!state || !dispatch) throw new Error('useDocument must be used within EditorProvider');
  return { state, dispatch };
};

export const useDocumentDispatch = () => {
  const context = useContext(DocumentDispatchContext);
  if (!context) throw new Error('useDocumentDispatch must be used within EditorProvider');
  return context;
};

export const useUI = () => {
  const state = useContext(UIStateContext);
  const dispatch = useContext(UIDispatchContext);
  if (!state || !dispatch) throw new Error('useUI must be used within EditorProvider');
  return { state, dispatch };
};

export const useUIDispatch = () => {
  const context = useContext(UIDispatchContext);
  if (!context) throw new Error('useUIDispatch must be used within EditorProvider');
  return context;
};

export const useHistory = () => {
  const history = useContext(HistoryContext);
  const dispatch = useContext(DocumentDispatchContext);
  if (!history || !dispatch) throw new Error('useHistory must be used within EditorProvider');
  return {
    ...history,
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    jumpTo: (index: number) => dispatch({ type: 'JUMP_TO_HISTORY', payload: index }),
  };
};
