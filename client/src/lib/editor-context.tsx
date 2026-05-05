import React, {createContext, ReactNode, useContext, useMemo, useReducer} from 'react';
import {DocumentState, EditorAction, EditorObject, EditorState, UIState} from './types';
import {v4 as uuidv4} from 'uuid';
import {CANVAS_BASE_HEIGHT, CANVAS_BASE_WIDTH} from '@/core/constants';

const initialDocumentState: DocumentState = {
  projectId: null,
  pdfFileId: null,
  overlayPdfFileId: null,
  pdfFile: null,
  overlayPdfFile: null,
  overlayOpacity: 0.5,
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
  pdfCanvasHeight: CANVAS_BASE_HEIGHT
};

const initialUIState: UIState = {
  selectedObjectIds: [],
  activeLayerId: null,
  currentPage: 1,
  scale: 4.1,
  scrollPos: { x: 0, y: 0 },
  tool: 'select',
  showStatusColors: false,
  objectDetailsOpen: false
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
      };
    case 'SET_PDF_DIMENSIONS':
      return {
        ...state,
        pdfCanvasHeight: Math.round(CANVAS_BASE_WIDTH * action.payload.height / action.payload.width)
      };
    case 'SET_OVERLAY_PDF':
      return { ...state, overlayPdfFile: action.payload };
    case 'SET_OVERLAY_OPACITY':
      return { ...state, overlayOpacity: action.payload };
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
      return { ...state, ...action.payload };
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
    case 'RESET_EDITOR':
      return { ...state, ...initialDocumentState };
    default:
      return state;
  }
};

const DocumentContext = createContext<{
  state: DocumentState;
  dispatch: React.Dispatch<EditorAction>;
} | null>(null);

const UIContext = createContext<{
  state: UIState;
  dispatch: React.Dispatch<EditorAction>;
} | null>(null);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const documentValue = useMemo(() => ({
    state: {
      projectId: state.projectId,
      pdfFileId: state.pdfFileId,
      overlayPdfFileId: state.overlayPdfFileId,
      pdfFile: state.pdfFile,
      overlayPdfFile: state.overlayPdfFile,
      overlayOpacity: state.overlayOpacity,
      layers: state.layers,
      objects: state.objects,
      clipboardObjects: state.clipboardObjects,
      autoNumbering: state.autoNumbering,
      exportSettings: state.exportSettings,
      customIcons: state.customIcons,
      pdfCanvasHeight: state.pdfCanvasHeight,
    },
    dispatch
  }), [state.projectId, state.pdfFileId, state.overlayPdfFileId, state.pdfFile, state.overlayPdfFile, state.overlayOpacity, state.layers, state.objects, state.clipboardObjects, state.autoNumbering, state.exportSettings, state.customIcons, state.pdfCanvasHeight, dispatch]);

  const uiValue = useMemo(() => ({
    state: {
      selectedObjectIds: state.selectedObjectIds,
      activeLayerId: state.activeLayerId,
      currentPage: state.currentPage,
      scale: state.scale,
      scrollPos: state.scrollPos,
      tool: state.tool,
      showStatusColors: state.showStatusColors,
      objectDetailsOpen: state.objectDetailsOpen,
    },
    dispatch
  }), [state.selectedObjectIds, state.activeLayerId, state.currentPage, state.scale, state.scrollPos, state.tool, state.showStatusColors, state.objectDetailsOpen, dispatch]);

  return (
    <DocumentContext.Provider value={documentValue}>
      <UIContext.Provider value={uiValue}>
        {children}
      </UIContext.Provider>
    </DocumentContext.Provider>
  );
};

export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) throw new Error('useDocument must be used within EditorProvider');
  return context;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within EditorProvider');
  return context;
};

// Kept for backward compatibility during migration
export const useEditor = () => {
  const doc = useDocument();
  const ui = useUI();
  return {
    state: { ...doc.state, ...ui.state } as EditorState,
    dispatch: doc.dispatch
  };
};

