import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { EditorState, EditorAction, Layer, EditorObject } from './types';
import { v4 as uuidv4 } from 'uuid';

const initialState: EditorState = {
  pdfFile: null,
  layers: [],
  objects: [],
  selectedObjectId: null,
  activeLayerId: null,
  currentPage: 1,
  scale: 1,
  scrollPos: { x: 0, y: 0 },
  tool: 'select',
  clipboardObject: null,
  autoNumbering: {
    enabled: false,
    prefix: 'IDF1-P1-',
    counter: 1,
    template: null
  },
  exportSettings: {
    labelFontSize: 10
  }
};

const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'SET_PDF':
      const defaultLayerId = uuidv4();
      return {
        ...state,
        pdfFile: action.payload,
        layers: [{ id: defaultLayerId, name: 'Layer 1', visible: true, locked: false, order: 0 }],
        activeLayerId: defaultLayerId,
        objects: [],
        currentPage: 1,
      };
    case 'ADD_LAYER':
      const newLayerId = uuidv4();
      const maxOrder = Math.max(...state.layers.map((l) => l.order), -1);
      return {
        ...state,
        layers: [
          ...state.layers,
          { id: newLayerId, name: action.payload, visible: true, locked: false, order: maxOrder + 1 },
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
        name: `${state.clipboardObject.name} (Copy)`
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
    default:
      return state;
  }
};

const EditorContext = createContext<{
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
} | null>(null);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
