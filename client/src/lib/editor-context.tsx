import React, {createContext, ReactNode, useContext, useEffect, useMemo, useReducer} from 'react';
import {DocumentState, EditorAction, EditorObject, EditorState, UIState} from './types';
import {v4 as uuidv4} from 'uuid';
import {CANVAS_BASE_HEIGHT, CANVAS_BASE_WIDTH} from '@/core/constants';
import {createInitialHistory, HistoryAction, HistoryEntry, withHistory} from './history';

/** Every paint-bucket fill lands in this layer. */
export const FILL_LAYER_NAME = 'Colors';

/** Two fills whose bounds differ by less than this (canvas units) are the same area. */
const SAME_FILL_EPSILON = 0.5;

/** Maximum manual overlay shift (unscaled canvas units) — keeps the overlay reachable on screen. */
const MAX_OVERLAY_OFFSET = CANVAS_BASE_WIDTH;

/** Rounds to 0.1 canvas unit — hand dragging at high zoom needs finer steps than whole units. */
const clampOverlayCoord = (v: number) =>
  Math.min(MAX_OVERLAY_OFFSET, Math.max(-MAX_OVERLAY_OFFSET, Math.round(v * 10) / 10 || 0));

const clampOverlayOffset = (offset: { x: number; y: number }) => ({
  x: clampOverlayCoord(offset.x),
  y: clampOverlayCoord(offset.y),
});

const IPAD_MODE_STORAGE_KEY = 'editor.ipadMode';

/** Saved choice, or on by default on touch-first devices (iPad, tablets). */
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
  measureCalibration: null
};

const initialUIState: UIState = {
  selectedObjectIds: [],
  activeLayerId: null,
  currentPage: 1,
  scale: 4.1,
  scrollPos: { x: 0, y: 0 },
  tool: 'select',
  showStatusColors: false,
  objectDetailsOpen: false,
  isImporting: false,
  fillColor: '#3b82f6',
  fillOpacity: 0.35,
  drawColor: '#000000',
  drawStrokeWidth: 2,
  drawStraight: false,
  ipadMode: loadIpadMode()
};

const initialState: EditorState = {
  ...initialDocumentState,
  ...initialUIState
};

const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
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
        currentPage: 1,
        pdfCanvasHeight: CANVAS_BASE_HEIGHT,
        measureCalibration: null,
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
        // Removing the overlay drops its manual alignment as well.
        overlayOffset: action.payload === null ? { x: 0, y: 0 } : state.overlayOffset,
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
    case 'ADD_OBJECT':
      return { ...state, objects: [...state.objects, action.payload] };
    case 'UPDATE_OBJECT':
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.payload.id ? { ...o, ...action.payload.updates } : o
        ),
      };
    case 'UPDATE_OBJECTS':
      return {
        ...state,
        objects: state.objects.map((o) =>
          action.payload.ids.includes(o.id) ? { ...o, ...action.payload.updates } : o
        ),
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
      return { ...state, tool: action.payload, selectedObjectIds: [] };
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
    case 'IMPORT_PROJECT':
      // Projects saved before the measuring tape have no calibration — don't keep the previous project's.
      return { ...state, measureCalibration: null, ...action.payload };
    case 'SET_MEASURE_CALIBRATION':
      return { ...state, measureCalibration: action.payload };
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
        console.log('[Paste] Failed: Clipboard empty');
        return state;
      }
      
      // Default to active layer, or first layer if none active
      const activeLayerId = state.activeLayerId || (state.layers.length > 0 ? state.layers[0].id : null);
      if (!activeLayerId) {
        console.log('[Paste] Failed: No layer available');
        return state;
      }
      
      const incrementString = (str: string) => {
        const match = str.match(/^(.*?)(\d+)([^\d]*)$/);
        if (!match) {
          console.log(`[Paste] No number found to increment in: "${str}"`);
          return str;
        }
        
        const prefix = match[1];
        const numStr = match[2];
        const suffix = match[3];
        
        const nextNum = parseInt(numStr, 10) + 1;
        const nextNumStr = nextNum.toString().padStart(numStr.length, '0');
        
        const result = `${prefix}${nextNumStr}${suffix}`;
        console.log(`[Paste] Incremented "${str}" -> "${result}"`);
        return result;
      };

      // Calculate the center of the group
      const minX = Math.min(...state.clipboardObjects.map(obj => obj.x));
      const minY = Math.min(...state.clipboardObjects.map(obj => obj.y));
      const maxX = Math.max(...state.clipboardObjects.map(obj => obj.x + (obj.width || 0)));
      const maxY = Math.max(...state.clipboardObjects.map(obj => obj.y + (obj.height || 0)));
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      console.log(`[Paste] PASTE_OBJECT action.payload:`, action.payload);

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
          console.log(`[Paste] Incremental paste for object type: ${o.type}, current content: "${content}", name: "${name}"`);
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

      return {
        ...state,
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
    case 'SET_FILL_SETTINGS':
    case 'SET_DRAW_SETTINGS':
      return { ...state, ...action.payload };
    case 'SET_IPAD_MODE':
      return { ...state, ipadMode: action.payload };
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
      return { ...state, ...initialDocumentState, tool: state.tool === 'pan-overlay' ? 'select' : state.tool };
    default:
      return state;
  }
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
  }), [state.measureCalibration, state.projectId, state.pdfFileId, state.overlayPdfFileId, state.pdfFile, state.overlayPdfFile, state.overlayOpacity, state.overlayOffset, state.layers, state.objects, state.clipboardObjects, state.autoNumbering, state.exportSettings, state.customIcons, state.pdfCanvasHeight]);

  const uiState = useMemo(() => ({
    selectedObjectIds: state.selectedObjectIds,
    activeLayerId: state.activeLayerId,
    currentPage: state.currentPage,
    scale: state.scale,
    scrollPos: state.scrollPos,
    tool: state.tool,
    showStatusColors: state.showStatusColors,
    objectDetailsOpen: state.objectDetailsOpen,
    isImporting: state.isImporting,
    fillColor: state.fillColor,
    fillOpacity: state.fillOpacity,
    drawColor: state.drawColor,
    drawStrokeWidth: state.drawStrokeWidth,
    drawStraight: state.drawStraight,
    ipadMode: state.ipadMode,
  }), [state.fillColor, state.fillOpacity, state.drawColor, state.drawStrokeWidth, state.drawStraight, state.ipadMode, state.selectedObjectIds, state.activeLayerId, state.currentPage, state.scale, state.scrollPos, state.tool, state.showStatusColors, state.objectDetailsOpen, state.isImporting]);

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
