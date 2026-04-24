# Refactoring Plan — PDF Blueprint Layers Editor

Based on full analysis of: `Toolbar.tsx` (1067 lines), `Canvas.tsx` (550 lines),
`editor-context.tsx` (209 lines), `types.ts` (88 lines).

---

## Priority 1 — Correctness Bugs (fix before any refactor)

### 1.1 Missing `opacity` on `Layer` type
**File:** `types.ts:1-7`

`Toolbar.tsx:428` and `Toolbar.tsx:468` both compute:
```ts
(obj.opacity ?? 1) * (layer.opacity ?? 1)
```
But `Layer` has no `opacity` field, so `layer.opacity` is always `undefined` → always `1`.
Either add the field or remove the dead multiplier.
```ts
// Option A: add to Layer type
export type Layer = {
  id: string; name: string; visible: boolean; locked: boolean; order: number;
  opacity: number; // 0–1, default 1
};
```

### 1.2 Unused `degreesToRadians` helper
**File:** `Toolbar.tsx:60`

Defined but never called anywhere. Delete it.

---

## Priority 2 — Performance: Context Split (highest-impact change)

### 2.1 The core problem
`EditorContext` holds everything in one state object. Every `SET_SCROLL` dispatch
(fired on every scroll event from `Canvas.tsx:174`) re-renders the entire consumer
tree — including `Toolbar.tsx`, which has expensive JSX subtrees.

### 2.2 Solution: split into two contexts

**`DocumentContext`** — slow-changing, consumed by both Toolbar and Canvas:
```ts
{ pdfFile, overlayPdfFile, overlayOpacity, layers, objects,
  clipboardObject, autoNumbering, exportSettings, customIcons }
```

**`UIContext`** — fast-changing, consumed only by Canvas and partially Toolbar:
```ts
{ selectedObjectId, activeLayerId, currentPage, scale, scrollPos, tool }
```

**Result:** Scroll events only trigger re-renders in Canvas. Toolbar only re-renders
when document data changes (object add/remove/update, not mouse move).

### 2.3 Debounce scroll dispatch
**File:** `Canvas.tsx:171-178`

`handleScroll` currently dispatches on every scroll frame. Use `useCallback` +
`useMemo` with a 16ms debounce (one frame):
```ts
const handleScroll = useCallback(
  debounce((e: React.UIEvent<HTMLDivElement>) => {
    dispatch({ type: 'SET_SCROLL', payload: { x: e.currentTarget.scrollLeft, y: e.currentTarget.scrollTop } });
  }, 16),
  [dispatch]
);
```

### 2.4 Memoize layer sort in export
**File:** `Toolbar.tsx:310-314`

The sort callback calls `state.layers.find()` for each comparison — O(n²).
Replace with a pre-built lookup map:
```ts
const layerOrderById = Object.fromEntries(state.layers.map(l => [l.id, l.order]));
const sortedObjects = [...state.objects].sort((a, b) =>
  (layerOrderById[a.layerId] ?? 0) - (layerOrderById[b.layerId] ?? 0)
);
```

---

## Priority 3 — Component-Level Anti-Patterns

### 3.1 Input components defined inside Toolbar
**File:** `Toolbar.tsx:612-640`

`FileInput`, `ProjectInput`, and `CustomIconInput` are React function components
defined inside `Toolbar`. React treats them as new component types every render,
causing unmount→remount on each re-render (resets the input's file value).
Move them to module scope or replace with plain `<input>` elements directly:
```tsx
// Replace FileInput component with direct JSX inside the label
<label htmlFor="image-upload" className="cursor-pointer">
  <ImageIcon className="w-4 h-4" />
  <input type="file" accept="image/*" className="hidden" id="image-upload" onChange={handleImageUpload} />
</label>
```

### 3.2 Duplicated SVG path scaling in Canvas
**File:** `Canvas.tsx:335-338` and `Canvas.tsx:367-370`

The path-scaling transform is copy-pasted in two places:
```ts
obj.pathData.split(' ').map((val) => {
  if (['M', 'L'].includes(val)) return val;
  return parseFloat(val) * state.scale;
}).join(' ')
```
Extract to a module-level utility:
```ts
// src/core/svg-utils.ts
export const scalePath = (pathData: string, scale: number): string =>
  pathData.split(' ').map(val =>
    ['M', 'L'].includes(val) ? val : String(parseFloat(val) * scale)
  ).join(' ');
```

### 3.3 Inline drop handler in Canvas JSX
**File:** `Canvas.tsx:190-238`

The `onDrop` handler (48 lines) is embedded directly in JSX, making the render
function hard to read. Extract to `handleDrop` alongside the other mouse handlers.

---

## Priority 4 — Architecture: Extract Pure Logic to `src/core/`

These are dependency-free functions that can be unit-tested without React or a browser.

### 4.1 `src/core/pdf-math.ts`
```ts
export const hexToRgb = (hex: string): RGB => { ... };      // from Toolbar.tsx:50
export const getPhysicalCoords = (                          // from Toolbar.tsx:337
  vx: number, vy: number, pW: number, pH: number, rotation: number
): { x: number; y: number } => { ... };
export const getVisualDimensions = (pW: number, pH: number, rotation: number) =>
  (rotation === 90 || rotation === 270) ? { vW: pH, vH: pW } : { vW: pW, vH: pH };
export const CANVAS_BASE_WIDTH = 600; // currently hardcoded in 6+ places
```

### 4.2 `src/core/svg-utils.ts`
```ts
export const scalePath = (pathData: string, scale: number): string => { ... };
export const svgToPng = (svgDataUrl: string, w: number, h: number): Promise<string> => { ... };
```

### 4.3 `src/core/icon-shapes.ts`
The `handleFlattenAndDownload` function (`Toolbar.tsx:474-550`) contains a large
`if/else` block building SVG path strings for each icon type. Extract to a data map:
```ts
export const buildIconPath = (
  iconType: string, w: number, h: number, minSide: number, offX: number, offY: number
): string | null => {
  const midX = w / 2, midY = h / 2;
  const top = offY + minSide, bottom = offY, left = offX, right = offX + minSide;
  const shapes: Record<string, string> = {
    triangle: `M ${midX} ${top} L ${right} ${bottom} L ${left} ${bottom} Z`,
    star:     `M ${midX} ${top} L ${right} ${midY} L ${midX} ${bottom} L ${left} ${midY} Z`,
    // ...
  };
  return shapes[iconType] ?? null;
};
```

---

## Priority 5 — Custom Hooks: Extract Business Logic from Components

### 5.1 `hooks/useExport.ts`
Move all of `handleFlattenAndDownload` and `handleExportProject` here.
The hook receives `state` (or uses context) and returns `{ exportPDF, exportProject }`.
**Benefit:** `Toolbar.tsx` drops from 1067 → ~600 lines. Export logic is independently testable.

### 5.2 `hooks/useObjectCreation.ts`
Move `getCenterPosition`, `handleAddText`, `handleAddIcon`, `handleImageUpload`,
`handleCustomIconUpload` here.
```ts
export const useObjectCreation = () => {
  const { state, dispatch } = useEditor();
  const getCenterPosition = (w: number, h: number) => { ... };
  return { handleAddText, handleAddIcon, handleImageUpload, handleCustomIconUpload };
};
```

### 5.3 `hooks/useDrawing.ts`
Move `drawingPath`, `isDrawing`, `handleMouseDown` (draw branch), `handleMouseMove`,
`handleMouseUp` from `Canvas.tsx` here.
```ts
export const useDrawing = (containerRef: RefObject<HTMLDivElement>) => {
  const [drawingPath, setDrawingPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  // ...
  return { drawingPath, isDrawing, onMouseDown, onMouseMove, onMouseUp };
};
```

---

## Priority 6 — Component Decomposition

### 6.1 `Canvas/ObjectRenderer.tsx`
The `state.objects.map(obj => <Rnd ...>)` block in `Canvas.tsx:380-545` is ~165 lines.
It handles rotation handles, label rendering, and all object types.
Extract as a component `<ObjectRenderer obj={obj} layer={layer} />`.
```tsx
// Canvas.tsx becomes:
{state.objects.map(obj => {
  const layer = state.layers.find(l => l.id === obj.layerId);
  if (!layer?.visible || obj.type === 'path') return null;
  return <ObjectRenderer key={obj.id} obj={obj} layer={layer} />;
})}
```

### 6.2 `Canvas/DrawingLayer.tsx`
Extract the `<svg>` overlay that renders path objects and the live drawing preview
(`Canvas.tsx:326-378`, ~52 lines) as `<DrawingLayer />`.

### 6.3 `Canvas/OverlayDocument.tsx`
The overlay PDF `<Document>` block (`Canvas.tsx:305-324`, ~20 lines) is a clear
unit. Extract as `<OverlayDocument />`.

---

## Target File Structure

```
src/
├── core/                      # Pure TS, no React, fully unit-testable
│   ├── pdf-math.ts            # hexToRgb, getPhysicalCoords, getVisualDimensions
│   ├── svg-utils.ts           # scalePath, svgToPng
│   ├── icon-shapes.ts         # buildIconPath()
│   └── constants.ts           # CANVAS_BASE_WIDTH = 600
├── hooks/
│   ├── useExport.ts           # handleFlattenAndDownload, handleExportProject
│   ├── useObjectCreation.ts   # getCenterPosition, handleAddText, handleAddIcon
│   └── useDrawing.ts          # drawingPath state + mouse handlers
├── components/
│   └── editor/
│       ├── Canvas/
│       │   ├── Canvas.tsx           # ~150 lines (orchestrator only)
│       │   ├── ObjectRenderer.tsx   # Rnd wrapper + all object types
│       │   ├── DrawingLayer.tsx     # SVG paths overlay
│       │   └── OverlayDocument.tsx  # Overlay PDF document
│       └── Toolbar/
│           ├── Toolbar.tsx          # ~200 lines (orchestrator only)
│           ├── ObjectInspector.tsx  # Selected-object controls (text, color, layer)
│           ├── IconPicker.tsx       # Standard + custom icons popover
│           ├── AutoNumbering.tsx    # Hash toggle + settings popover
│           └── ZoomControls.tsx     # Slider + +/- buttons
└── lib/
    ├── types.ts               # + add opacity to Layer
    ├── editor-context.tsx     # Split into document-context + ui-context
    └── utils.ts
```

---

## Implementation Order

| Step | Change | Risk | Benefit |
|------|--------|------|---------|
| 1 | Fix `Layer.opacity` type bug | Low | Correctness |
| 2 | Delete `degreesToRadians` | Low | Cleanliness |
| 3 | Move `FileInput`/`ProjectInput`/`CustomIconInput` to module scope | Low | Fix re-mount bug |
| 4 | Extract `src/core/` (pure functions) | Low | Testability |
| 5 | Deduplicate `scalePath` in Canvas | Low | DRY |
| 6 | Extract `useExport` hook | Medium | −430 lines from Toolbar |
| 7 | Extract `useObjectCreation` hook | Medium | −150 lines from Toolbar |
| 8 | Extract `useDrawing` hook | Medium | −120 lines from Canvas |
| 9 | Extract `ObjectRenderer.tsx` | Medium | −165 lines from Canvas |
| 10 | Extract `DrawingLayer`, `OverlayDocument` | Low | Readability |
| 11 | Extract Toolbar sub-components | Medium | −300 lines from Toolbar |
| 12 | Split EditorContext (UI vs Document) | High | Eliminates scroll re-renders |
