export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
  opacity: number; // 0–1
};

export type EditorObject = {
  id: string;
  type: 'text' | 'image' | 'icon' | 'path';
  x: number;
  y: number;
  width: number;
  height: number;
  layerId: string;
  name?: string; // User-defined name
  content?: string; // For text or image URL
  pathData?: string; // For SVG paths
  metadata?: {
    socketId?: string;
    patchPanelPort?: string;
    purpose?: 'Data' | 'Mic' | 'CAM' | 'TV' | 'Other';
    switchId?: string;
    cableId?: string;
  };
  color?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontWeight?: string; // 'normal' | 'bold'
  opacity?: number;
  rotation?: number; // Rotation in degrees
};

export type DocumentState = {
  pdfFile: File | null;
  overlayPdfFile: File | null;
  overlayOpacity: number;
  layers: Layer[];
  objects: EditorObject[];
  clipboardObject: EditorObject | null;
  autoNumbering: {
    enabled: boolean;
    prefix: string;
    counter: number;
    template: {
      type: 'icon';
      content: string;
      color: string;
    } | null;
  };
  exportSettings: {
    labelFontSize: number;
  };
  customIcons: { id: string; url: string; name: string }[];
  pdfCanvasHeight: number;
};

export type UIState = {
  selectedObjectId: string | null;
  activeLayerId: string | null;
  currentPage: number;
  scale: number;
  scrollPos: { x: number; y: number };
  tool: 'select' | 'text' | 'image' | 'icon' | 'draw' | 'stamp';
};

export type EditorState = DocumentState & UIState;

export type EditorAction =
  | { type: 'SET_PDF'; payload: File }
  | { type: 'SET_OVERLAY_PDF'; payload: File | null }
  | { type: 'SET_OVERLAY_OPACITY'; payload: number }
  | { type: 'ADD_LAYER'; payload: string } // name
  | { type: 'UPDATE_LAYER'; payload: { id: string; updates: Partial<Layer> } }
  | { type: 'TOGGLE_LAYER_VISIBILITY'; payload: string } // id
  | { type: 'SELECT_LAYER'; payload: string } // id
  | { type: 'DELETE_LAYER'; payload: string } // id
  | { type: 'ADD_OBJECT'; payload: EditorObject }
  | { type: 'UPDATE_OBJECT'; payload: { id: string; updates: Partial<EditorObject> } }
  | { type: 'DELETE_OBJECT'; payload: string }
  | { type: 'SELECT_OBJECT'; payload: string | null }
  | { type: 'SET_TOOL'; payload: UIState['tool'] }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_SCALE'; payload: number }
  | { type: 'SET_SCROLL'; payload: { x: number; y: number } }
  | { type: 'IMPORT_PROJECT'; payload: Partial<EditorState> }
  | { type: 'REORDER_LAYERS'; payload: { sourceIndex: number; destinationIndex: number } }
  | { type: 'COPY_OBJECT' }
  | { type: 'PASTE_OBJECT' }
  | { type: 'SET_AUTO_NUMBERING'; payload: Partial<DocumentState['autoNumbering']> }
  | { type: 'INCREMENT_COUNTER' }
  | { type: 'SET_EXPORT_SETTINGS'; payload: Partial<DocumentState['exportSettings']> }
  | { type: 'ADD_CUSTOM_ICON'; payload: { id: string; url: string; name: string } }
  | { type: 'DELETE_CUSTOM_ICON'; payload: string }
  | { type: 'SET_PDF_DIMENSIONS'; payload: { width: number; height: number } };
