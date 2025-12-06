export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
};

export type EditorObject = {
  id: string;
  type: 'text' | 'image' | 'icon' | 'path';
  x: number;
  y: number;
  width: number;
  height: number;
  layerId: string;
  content?: string; // For text or image URL
  pathData?: string; // For SVG paths
  color?: string;
  fontSize?: number;
  opacity?: number;
  rotation?: number; // Rotation in degrees
};

export type EditorState = {
  pdfFile: File | null;
  layers: Layer[];
  objects: EditorObject[];
  selectedObjectId: string | null;
  activeLayerId: string | null;
  currentPage: number;
  scale: number;
  tool: 'select' | 'text' | 'image' | 'icon' | 'draw';
};

export type EditorAction =
  | { type: 'SET_PDF'; payload: File }
  | { type: 'ADD_LAYER'; payload: string } // name
  | { type: 'TOGGLE_LAYER_VISIBILITY'; payload: string } // id
  | { type: 'SELECT_LAYER'; payload: string } // id
  | { type: 'ADD_OBJECT'; payload: EditorObject }
  | { type: 'UPDATE_OBJECT'; payload: { id: string; updates: Partial<EditorObject> } }
  | { type: 'DELETE_OBJECT'; payload: string }
  | { type: 'SELECT_OBJECT'; payload: string | null }
  | { type: 'SET_TOOL'; payload: EditorState['tool'] }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_SCALE'; payload: number }
  | { type: 'IMPORT_PROJECT'; payload: Partial<EditorState> }
  | { type: 'REORDER_LAYERS'; payload: { sourceIndex: number; destinationIndex: number } };
