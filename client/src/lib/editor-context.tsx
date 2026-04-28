import React, {createContext, ReactNode, useContext, useMemo, useReducer} from 'react';
import {DocumentState, EditorAction, EditorState, UIState} from './types';
import {v4 as uuidv4} from 'uuid';
import {CANVAS_BASE_HEIGHT, CANVAS_BASE_WIDTH} from '@/core/constants';

const initialDocumentState: DocumentState = {
  pdfFile: null,
  overlayPdfFile: null,
  overlayOpacity: 0.5,
  layers: [],
  objects: [],
  clipboardObject: null,
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
  selectedObjectId: null,
  activeLayerId: null,
  currentPage: 1,
  scale: 1,
  scrollPos: { x: 0, y: 0 },
  tool: 'select'
};

const initialState: EditorState = {
  ...initialDocumentState,
  ...initialUIState
};

const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
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
      return { ...state, activeLayerId: action.payload };
    case 'DELETE_LAYER': {
      const layerId = action.payload;
      const remainingLayers = state.layers.filter(l => l.id !== layerId);
      const remainingObjects = state.objects.filter(o => o.layerId !== layerId);
      
      let newActiveLayerId = state.activeLayerId;
      if (state.activeLayerId === layerId) {
        newActiveLayerId = remainingLayers.length > 0 ? remainingLayers[0].id : null;
      }
      
      let newSelectedObjectId = state.selectedObjectId;
      if (state.selectedObjectId) {
         const selectedObject = state.objects.find(o => o.id === state.selectedObjectId);
         if (selectedObject && selectedObject.layerId === layerId) {
             newSelectedObjectId = null;
         }
      }

      return {
        ...state,
        layers: remainingLayers,
        objects: remainingObjects,
        activeLayerId: newActiveLayerId,
        selectedObjectId: newSelectedObjectId
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
    case 'DELETE_OBJECT':
      return {
        ...state,
        objects: state.objects.filter((o) => o.id !== action.payload),
        selectedObjectId: null,
      };
    case 'SELECT_OBJECT':
      return { ...state, selectedObjectId: action.payload };
    case 'SET_TOOL':
      return { ...state, tool: action.payload, selectedObjectId: null };
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
      if (!state.selectedObjectId) return state;
      const objectToCopy = state.objects.find(o => o.id === state.selectedObjectId);
      if (!objectToCopy) return state;
      return { ...state, clipboardObject: { ...objectToCopy } };
    }
    case 'PASTE_OBJECT': {
      if (!state.clipboardObject || !state.activeLayerId) return state;
      const newId = uuidv4();
      const offset = 20 / state.scale;
      const newObject = {
        ...state.clipboardObject,
        id: newId,
        x: state.clipboardObject.x + offset,
        y: state.clipboardObject.y + offset,
        layerId: state.activeLayerId, // Paste into active layer
        name: state.clipboardObject.name // Preserve original name without suffix
      };
      return {
        ...state,
        objects: [...state.objects, newObject],
        selectedObjectId: newId
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
      pdfFile: state.pdfFile,
      overlayPdfFile: state.overlayPdfFile,
      overlayOpacity: state.overlayOpacity,
      layers: state.layers,
      objects: state.objects,
      clipboardObject: state.clipboardObject,
      autoNumbering: state.autoNumbering,
      exportSettings: state.exportSettings,
      customIcons: state.customIcons,
      pdfCanvasHeight: state.pdfCanvasHeight,
    },
    dispatch
  }), [state.pdfFile, state.overlayPdfFile, state.overlayOpacity, state.layers, state.objects, state.clipboardObject, state.autoNumbering, state.exportSettings, state.customIcons, state.pdfCanvasHeight, dispatch]);

  const uiValue = useMemo(() => ({
    state: {
      selectedObjectId: state.selectedObjectId,
      activeLayerId: state.activeLayerId,
      currentPage: state.currentPage,
      scale: state.scale,
      scrollPos: state.scrollPos,
      tool: state.tool,
    },
    dispatch
  }), [state.selectedObjectId, state.activeLayerId, state.currentPage, state.scale, state.scrollPos, state.tool, dispatch]);

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
