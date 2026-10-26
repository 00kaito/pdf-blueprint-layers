import type {CropRect, PaperId, PaperOrientation} from '@/core/paper';

/** Part of the plan exported onto a sheet of print paper (rect in unscaled canvas units, paper's aspect). */
export type ExportCrop = {
  paper: PaperId;
  orientation: PaperOrientation;
  rect: CropRect;
};

export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
  opacity: number; // 0–1
};

export type PlanChange = 'RELOCATE' | 'REMOVE' | 'NEW' | 'ON_HOLD';

export type CableType = 'CAT6' | 'SPEAKER' | 'POWER' | 'COAX' | 'FIBER' | 'OTHER';

export type CableSpec = { type: CableType; count: number };

/** Project-wide low-voltage settings used by the cable summary. */
export type LvSettings = {
  /** Cables a newly placed device gets, by icon type (`EditorObject.content`); updated whenever a device's cables are edited. */
  cableDefaults: Record<string, CableSpec[]>;
  portsPerPanel: 24 | 48;
  /** Service loop left in the rack, per cable (ft). */
  serviceLoopFt: number;
  /** Slack at the device incl. the drop from the ceiling, per cable (ft). */
  deviceSlackFt: number;
  /** Cable sold per box / reel (ft). */
  boxLengthFt: number;
};

/**
 * Cable route (tray / J-hook path) drawn on the plan: control points in unscaled canvas units, joined
 * by straight horizontal / vertical runs. Cables follow routes to their rack.
 */
export type CableRoute = {
  id: string;
  points: { x: number; y: number }[];
  /** Rack / IDF whose cables use this route; unset = shared by all racks. */
  rackId?: string;
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
  /** Side of the object the name label is drawn on (default 'bottom'). */
  labelPosition?: 'bottom' | 'top' | 'left' | 'right';
  /**
   * Manually dragged label: offset of the label centre from the object centre, in unscaled canvas
   * units. Overrides `labelPosition`; a dashed leader line then connects the label to the object.
   */
  labelOffset?: { x: number; y: number };
  content?: string; // For text or image URL
  pathData?: string; // For SVG paths
  metadata?: {
    socketId?: string;
    patchPanelPort?: string;
    switchId?: string;
    cableId?: string;
    /** Rack the cables home-run to; unset = the rack with the shortest run. */
    rackId?: string;
  };
  color?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontWeight?: string; // 'normal' | 'bold'
  opacity?: number;
  rotation?: number; // Rotation in degrees
  photos?: string[];
  status?: 'PLANNED' | 'CABLE_PULLED' | 'TERMINATED' | 'TESTED' | 'APPROVED' | 'ISSUE';
  statusUpdatedAt?: string;
  statusUpdatedBy?: string;
  issueDescription?: string;
  /** Design change, independent of the install progress in `status`. */
  change?: PlanChange;
  /** Where the object stood when it was marked RELOCATE — drawn as a ghost with an arrow to the new spot. */
  changeOrigin?: { x: number; y: number };
  /** Coverage area: cameras that must see it; unset / empty = every camera. */
  coverageCameraIds?: string[];
  /** CCTV camera field of view; unset values use the type's defaults (30 ft / 110°, 360° camera 18 ft / 360°). */
  camera?: { rangeFt?: number; angleDeg?: number };
  changeNote?: string;
  changeUpdatedAt?: string;
  changeUpdatedBy?: string;
  /** Cables home-run from this point to its rack. */
  cables?: CableSpec[];
  comments?: string[];
  notes?: string;
  /** Area filled with the paint-bucket tool (content = colour PNG mask); lives in the Colors layer. */
  isFill?: boolean;
};

/**
 * Scale reference for the measuring tape, set with the calibration tool: a line drawn over a known
 * dimension of the blueprint. Stored in unscaled canvas units, so it is independent of the zoom.
 */
export type MeasureCalibration = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Real length of the reference line, in feet. */
  feet: number;
};

export type DocumentState = {
  projectId: string | null;
  pdfFileId: string | null;
  overlayPdfFileId: string | null;
  pdfFile: File | null;
  overlayPdfFile: File | null;
  overlayOpacity: number;
  /** Manual alignment offset of the overlay document, in unscaled canvas units. */
  overlayOffset: { x: number; y: number };
  layers: Layer[];
  objects: EditorObject[];
  clipboardObjects: EditorObject[];
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
    /** Unset = the whole page at its own size. */
    crop?: ExportCrop | null;
    /** Append the cable summary, legend and device schedule pages (off unless ticked). */
    includeCableSummary?: boolean;
  };
  /** Legacy: icons older projects kept inline. Moved into the shared icon library on open (useLegacyIconMigration). */
  customIcons: { id: string; url: string; name: string }[];
  pdfCanvasHeight: number;
  measureCalibration: MeasureCalibration | null;
  lvSettings: LvSettings;
  cableRoutes: CableRoute[];
};

export type UIState = {
  selectedObjectIds: string[];
  activeLayerId: string | null;
  currentPage: number;
  scale: number;
  scrollPos: { x: number; y: number };
  /** 'pan-overlay' = hand tool dragging the overlay blueprint to align it with the main one. */
  /** 'calibrate' = set the measuring scale from a known dimension; 'measure' = measuring tape. */
  /** 'route' = draw cable routes (click control points). */
  /** 'wall' = draw a camera blindspot wall (click its corner points); 'area' = draw a coverage area (closed outline). */
  tool: 'select' | 'text' | 'image' | 'icon' | 'draw' | 'stamp' | 'fill' | 'pan-overlay' | 'calibrate' | 'measure' | 'route' | 'wall' | 'area';
  /** Wall tool: runs at multiples of 45° only. */
  wallStraight: boolean;
  /** Wall tool: points stick to existing walls and blindspots. */
  wallSnap: boolean;
  /** Paint-bucket settings (hex colour, 0–1 opacity). */
  fillColor: string;
  fillOpacity: number;
  /** Draw (pencil) settings: hex colour and stroke width in unscaled canvas units. */
  drawColor: string;
  drawStrokeWidth: number;
  /** Straight horizontal / vertical strokes (touch replacement for holding Shift). */
  drawStraight: boolean;
  /** Touch layout: bigger controls and gesture hints (on by default on tablets). Input is `stylusOnly`. Remembered per device. */
  ipadMode: boolean;
  /** Stylus-only input: tools work only with a stylus (or mouse); fingers pan, zoom and tap. */
  stylusOnly: boolean;
  /** Measuring tape left on the blueprint (unscaled canvas units, `a` = where it was pulled from). Session only. */
  measureTape: { a: { x: number; y: number }; b: { x: number; y: number } } | null;
  /** Snap dragged objects to the edges / centres of nearby objects. Remembered per device. */
  snapEnabled: boolean;
  showStatusColors: boolean;
  /** Cable routes drawn on the plan (always shown while the route tool is active). */
  showCableRoutes: boolean;
  /** CCTV fields of view drawn on the plan (and exported). Remembered per device. */
  showCameraCoverage: boolean;
  /** Coverage in one colour, without the 15 ft near / far split (also exported). Remembered per device. */
  coverageSolid: boolean;
  /** Cable route selected for deleting / extending. */
  selectedRouteId: string | null;
  /** IDF the route tool draws for: a rack id, 'shared', or null = the first rack. */
  routeRackId: string | 'shared' | null;
  cableSummaryOpen: boolean;
  objectDetailsOpen: boolean;
  isImporting: boolean;
  /** Export PDF flow: its dialog, or the crop frame being adjusted on the plan (dialog hidden). */
  exportStep: 'closed' | 'dialog' | 'crop';
};

export type EditorState = DocumentState & UIState;

export type EditorAction =
  | { type: 'SET_PROJECT_ID'; payload: string | null }
  | { type: 'SET_PDF_FILE_IDS'; payload: { pdfFileId: string | null; overlayPdfFileId: string | null } }
  | { type: 'SET_PDF'; payload: File }
  /** New revision of the blueprint: swaps the PDF, keeps layers, objects and the measuring scale. */
  | { type: 'REPLACE_PDF'; payload: { file: File; fileId: string | null } }
  | { type: 'SET_OVERLAY_PDF'; payload: File | null }
  | { type: 'SET_OVERLAY_OPACITY'; payload: number }
  | { type: 'SET_OVERLAY_OFFSET'; payload: { x: number; y: number } }
  | { type: 'ADD_LAYER'; payload: string } // name
  | { type: 'UPDATE_LAYER'; payload: { id: string; updates: Partial<Layer> } }
  | { type: 'TOGGLE_LAYER_VISIBILITY'; payload: string } // id
  | { type: 'SELECT_LAYER'; payload: string } // id
  | { type: 'SET_ACTIVE_LAYER'; payload: string } // id
  | { type: 'DELETE_LAYER'; payload: string } // id
  | { type: 'ADD_OBJECT'; payload: EditorObject }
  | { type: 'UPDATE_OBJECT'; payload: { id: string; updates: Partial<EditorObject> } }
  | { type: 'UPDATE_OBJECTS'; payload: { ids: string[]; updates: Partial<EditorObject> } }
  /** Resizes each object by `factor` around its own centre (1.2 = +20%). */
  | { type: 'SCALE_OBJECTS'; payload: { ids: string[]; factor: number } }
  /** Clone an object next to itself (tablet double tap); the clone gets `newId` and is selected. */
  | { type: 'DUPLICATE_OBJECT'; payload: { id: string; newId: string } }
  /** A different label per object (bulk rename with a numbering pattern) — one undo step. */
  | { type: 'RENAME_OBJECTS'; payload: Record<string, string> }
  | { type: 'DELETE_OBJECT'; payload: string }
  | { type: 'DELETE_OBJECTS'; payload: string[] }
  | { type: 'SELECT_OBJECT'; payload: string | null }
  | { type: 'TOGGLE_OBJECT_SELECTION'; payload: string }
  | { type: 'SET_SELECTION'; payload: string[] }
  | { type: 'SET_TOOL'; payload: UIState['tool'] }
  | { type: 'OPEN_OBJECT_DETAILS' }
  | { type: 'CLOSE_OBJECT_DETAILS' }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_SCALE'; payload: number }
  | { type: 'SET_SCROLL'; payload: { x: number; y: number } }
  | { type: 'IMPORT_PROJECT'; payload: Partial<EditorState> }
  | { type: 'REORDER_LAYERS'; payload: { sourceIndex: number; destinationIndex: number } }
  | { type: 'COPY_OBJECT' }
  | { type: 'PASTE_OBJECT'; payload?: { x: number; y: number; isIncremental?: boolean } }
  | { type: 'SET_AUTO_NUMBERING'; payload: Partial<DocumentState['autoNumbering']> }
  | { type: 'INCREMENT_COUNTER' }
  | { type: 'SET_EXPORT_SETTINGS'; payload: Partial<DocumentState['exportSettings']> }
  | { type: 'SET_MEASURE_CALIBRATION'; payload: MeasureCalibration | null }
  /** Sets the cables of objects and makes them the default for each object's device type. */
  | { type: 'SET_OBJECT_CABLES'; payload: { ids: string[]; cables: CableSpec[] } }
  | { type: 'SET_LV_SETTINGS'; payload: Partial<Omit<LvSettings, 'cableDefaults'>> }
  | { type: 'ADD_CABLE_ROUTE'; payload: CableRoute }
  | { type: 'DELETE_CABLE_ROUTE'; payload: string }
  | { type: 'SET_CABLE_ROUTE_RACK'; payload: { id: string; rackId: string | undefined } }
  | { type: 'SET_ROUTE_RACK'; payload: UIState['routeRackId'] }
  | { type: 'SELECT_CABLE_ROUTE'; payload: string | null }
  | { type: 'TOGGLE_CABLE_ROUTES' }
  | { type: 'TOGGLE_CAMERA_COVERAGE' }
  | { type: 'TOGGLE_COVERAGE_SOLID' }
  | { type: 'SET_CABLE_SUMMARY_OPEN'; payload: boolean }
  | { type: 'ADD_CUSTOM_ICON'; payload: { id: string; url: string; name: string } }
  | { type: 'DELETE_CUSTOM_ICON'; payload: string }
  /** Drops the legacy inline icons once they are in the shared library. */
  | { type: 'CLEAR_CUSTOM_ICONS' }
  | { type: 'SET_PDF_DIMENSIONS'; payload: { width: number; height: number } }
  | { type: 'ADD_OBJECT_PHOTO'; payload: { id: string; photoDataUrl: string } }
  | { type: 'REMOVE_OBJECT_PHOTO'; payload: { id: string; index: number } }
  | { type: 'TOGGLE_STATUS_COLORS' }
  | { type: 'SET_IMPORTING'; payload: boolean }
  | { type: 'SET_EXPORT_STEP'; payload: UIState['exportStep'] }
  | { type: 'RESET_EDITOR' }
  | { type: 'SET_FILL_SETTINGS'; payload: Partial<Pick<UIState, 'fillColor' | 'fillOpacity'>> }
  | { type: 'SET_WALL_SETTINGS'; payload: Partial<Pick<UIState, 'wallStraight' | 'wallSnap'>> }
  | { type: 'SET_DRAW_SETTINGS'; payload: Partial<Pick<UIState, 'drawColor' | 'drawStrokeWidth' | 'drawStraight'>> }
  | { type: 'SET_IPAD_MODE'; payload: boolean }
  | { type: 'SET_STYLUS_ONLY'; payload: boolean }
  | { type: 'SET_MEASURE_TAPE'; payload: UIState['measureTape'] }
  | { type: 'SET_SNAP_ENABLED'; payload: boolean }
  /** Adds a paint-bucket fill to the Colors layer (created if missing). Re-filling the same area replaces it. */
  | { type: 'ADD_FILL'; payload: { object: EditorObject; newLayerId: string } };
