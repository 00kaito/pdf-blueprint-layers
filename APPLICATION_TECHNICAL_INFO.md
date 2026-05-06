# Dokumentacja Architektoniczna: PDF Blueprint Layers Editor

## 1. Przegląd Systemu
Aplikacja jest zaawansowanym edytorem webowym służącym do nakładania warstw interaktywnych (adnotacji, ikon, rysunków) na pliki PDF. System charakteryzuje się modularną architekturą, wysoką wydajnością oraz precyzyjnym silnikiem eksportu wektorowego.

### Stos Technologiczny
*   **Core**: React 18, TypeScript, Vite.
*   **State**: Context API (Split Pattern) + useReducer.
*   **PDF**: `react-pdf` (View), `pdf-lib` (Export/Manipulation).
*   **Interakcja**: `react-rnd` (Drag & Resize), `lucide-react` (Icons).

---

## 2. Architektura Stanu (Context Split)

Stan aplikacji jest rozdzielony na dwa niezależne konteksty w `client/src/lib/editor-context.tsx` (264 lines).

### 2.0. Centralized Configuration (`server/config.ts`)
System wykorzystuje scentralizowany plik konfiguracji `server/config.ts`, który na podstawie zmiennych środowiskowych i trybu `NODE_ENV` definiuje parametry pracy serwera (Port, Storage Type, Database URL, Session Secret). Pozwala to na uniknięcie redundancji i mieszania zależności między trybem lokalnym a produkcyjnym.

### 2.1. DocumentContext (`DocumentState`)
Zarządza danymi "ciężkimi" i wolnozmiennymi. Zmiana powoduje re-render całego edytora.
*   `pdfFile`, `overlayPdfFile`: Surowe pliki dokumentów.
*   `layers`, `objects`: Struktura warstw i elementów blueprintu.
*   `customIcons`, `exportSettings`, `autoNumbering`: Dane konfiguracyjne użytkownika.
*   `clipboardObjects`: Lista obiektów w schowku.

### 2.2. UIContext (`UIState`)
Zarządza danymi szybkozmiennymi. Scroll i zmiana narzędzia nie wymuszają re-renderu ciężkich komponentów.
*   `scrollPos`: Pozycja przewijania (debounced, 16ms).
*   `scale`: Aktualny Zoom.
*   `tool`: Wybrane narzędzie (`select`, `draw`, `text`, `stamp`).
*   `selectedObjectId`, `activeLayerId`, `currentPage`.

### 2.3. Hooki dostępowe
*   **`useDocument()`** — dostęp do `DocumentContext`. Używaj w komponentach pracujących na danych (LayerPanel, PropertiesPanel, Toolbar).
*   **`useUI()`** — dostęp do `UIContext`. Używaj do renderowania interaktywnych elementów (Canvas, ObjectRenderer).
*   **`useEditor()`** — hook zgodności wstecznej, łączy oba konteksty. **Nieużywany** — bezpieczny do usunięcia.

---

## 3. Warstwa Logiki Core (`client/src/core/`)

Czyste funkcje TypeScript, niezależne od Reacta, w pełni testowalne jednostkowo.

*   **`constants.ts`** (5 lines): Globalne źródło prawdy.
    ```ts
    CANVAS_BASE_WIDTH = 600   // przestrzeń modelu (px)
    CANVAS_BASE_HEIGHT = 800
    DEFAULT_LABEL_FONT_SIZE = 1
    SVG_RENDER_QUALITY_MULTIPLIER = 4  // ~288 DPI
    ```
*   **`pdf-math.ts`** (47 lines): Silnik transformacji współrzędnych. `getPhysicalCoords(vx, vy, pW, pH, rotation)` przelicza z układu "Screen TL" na "PDF BL" dla rotacji 0°/90°/180°/270°.
*   **`svg-utils.ts`** (44 lines): `scalePath(pathData, scale)` skaluje ścieżki SVG; `svgToPng(svgDataUrl, w, h)` konwertuje SVG→PNG z mnożnikiem 4x.
*   **`icon-shapes.ts`** (32 lines): `buildIconPath(iconType, w, h, ...)` — słownik definicji wektorowych ikon. **Uwaga:** kształt `heart` jest placeholderem (identyczny z `diamond`).

---

## 4. Custom Hooks (`client/src/hooks/`)

*   **`useExport.ts`** (201 lines): Buduje finalny PDF. Obsługuje word-wrap, `push/popGraphicsState`, optymalizację obrazów i sortowanie obiektów warstwami (O(n) via `layerOrderById` map). Eksportuje też pełny projekt JSON.
*   **`useObjectCreation.ts`** (101 lines): Dodaje nowe obiekty. `getCenterPosition(w, h)` oblicza środek aktualnego widoku. Obsługuje upload własnych ikon.
*   **`useDrawing.ts`** (63 lines): Silnik rysowania odręcznego z Shift-constraint dla prostych linii.

---

## 5. Dekompozycja Komponentów (`client/src/components/editor/`)

### 5.1. Canvas (Orkiestrator) — 98 lines
`Canvas.tsx` zarządza tylko routingiem zdarzeń myszy i kompozycją podkomponentów:
*   **`Canvas/ObjectRenderer.tsx`** (117 lines): Opakowuje obiekty w `Rnd`. Obsługuje rotację (45° snap), resize, `contentEditable` dla tekstu, counter-rotation etykiet.
*   **`Canvas/DrawingLayer.tsx`** (45 lines): Warstwa SVG dla rysunków odręcznych i podglądu live.
*   **`Canvas/OverlayDocument.tsx`** (25 lines): Renderer nakładki PDF z kontrolą przezroczystości. **Znany problem:** `width={600}` hardcoded — powinien używać `CANVAS_BASE_WIDTH`.

### 5.2. Toolbar — 331 lines
Narzędzia, ustawienia eksportu, galeria ikon. Używa `useObjectCreation` i `useExport`.

### 5.3. LayerPanel — 321 lines
Lista warstw. `slice().reverse()` — wizualnie "od góry", renderowanie "od spodu".

### 5.4. PropertiesPanel — 101 lines
Właściwości zaznaczonego obiektu: nazwa, X/Y, opacity.

---

## 6. Kluczowe Algorytmy

### 6.1. Mapowanie Współrzędnych PDF
```
getPhysicalCoords(vx, vy, pW, pH, rotation):
  0°:   px = vx,      py = pH - vy
  90°:  px = vy,      py = vx
  180°: px = pW - vx, py = vy
  270°: px = pW - vy, py = pH - vx
```

### 6.2. Optymalizacja Wydajności
*   **Debounce Scroll**: `useCallback(debounce(..., 16), [dispatch])` — max 62 aktualizacje/s.
*   **Sorting Map (O(n))**: `layerOrderById = {id: index}` — sortowanie obiektów bez iteracji przez warstwy dla każdego obiektu.
*   **Split Context**: UIContext zmieniany często (scroll, hover) nie powoduje re-renderu DocumentContext subskrybentów.

### 6.3. Rotacja Obiektów
```ts
const rawRotation = (startRotation + (mouseY - startY) * 2) % 360;
const newRotation = Math.round(rawRotation / 45) * 45;  // snap do 45°
```

---

## 7. Katalog Modułów i Funkcji (Przewodnik Dewelopera)

### 7.1. Struktury Danych (`client/src/lib/types.ts`)
*   **`EditorObject`**: Typ (`text|icon|image|path`), współrzędne modelu (niezeskalowane), `rotation`, `opacity`, metadane.
*   **`Layer`**: `visible` (renderowanie), `locked` (interakcje), `opacity` (eksport) — wszystkie inicjowane wartościami domyślnymi w `editor-context.tsx`.
*   **`DocumentState`** / **`UIState`**: Rozdzielone typy stanu. `EditorState = DocumentState & UIState` (typ pomocniczy).

### 7.2. Zarządzanie Stanem
```ts
// Dostęp do danych dokumentu (warstwy, obiekty, pliki):
const { state, dispatch } = useDocument();

// Dostęp do stanu UI (scale, tool, selectedObjectId):
const { state: uiState } = useUI();

// NIE używaj useEditor() — deprecated, do usunięcia
```

### 7.3. Logika Core
*   `getPhysicalCoords(vx, vy, pW, pH, pageRotation)` — **wymagane 5 argumentów**.
*   `scalePath(pathData, scale)` — bezpieczne dla ścieżek M/L; inne komendy SVG pomija.
*   `svgToPng(url, w, h)` — asynchroniczny, zwraca `Promise<string>` (data URL).
*   `buildIconPath(type, w, h, minSide, offX, offY)` — zwraca `string | null` (null = brak kształtu).

### 7.4. Wzorzec Tworzenia Obiektów
```ts
// Minimalny obiekt dodawany do stanu:
{
  id: uuidv4(),
  type: 'icon',
  name: '',
  x, y, width, height,
  layerId: uiState.activeLayerId,
  content: iconType,
  color: '#ef4444',   // domyślny kolor ikon (magic number — kandydat do constants.ts)
  rotation: 0,
  fontSize: 16,       // domyślny rozmiar tekstu (magic number)
  opacity: 1,
}
```

---

## 8. Stan Architektury i Znane Problemy

### 8.1. Architektura — STABILNA ✅
Refactoring zakończony. Architektura warstwowa (`core/ → hooks/ → components/`) jest czysta i gotowa do dalszego rozwoju. Wszystkie krytyczne bugi (A–F z TASK6) zostały naprawione.

### 8.2. Nieurgentne Problemy Techniczne
| Problem | Plik | Priorytet |
|---|---|---|
| `width={600}` hardcoded | `Canvas/OverlayDocument.tsx:18` | Niski |
| `useEditor()` nieużywany | `editor-context.tsx` | Niski (cleanup) |
| `#ef4444` magic string | `useObjectCreation.ts`, `useExport.ts`, `Canvas.tsx` | Niski |
| `fontSize: 16` magic number | `Canvas.tsx:62` | Niski |
| Kształt `heart` = placeholder | `icon-shapes.ts` | Niski |
| Brak error boundaries | Cała aplikacja | Średni |
| Toolbar >300 linii | `Toolbar.tsx` | Średni (wydzielić sub-komponenty) |

### 8.3. Poprawka OverlayDocument (gotowa do zastosowania)
```tsx
// Canvas/OverlayDocument.tsx:18 — zmień:
width={600}
// na:
width={CANVAS_BASE_WIDTH}
// i dodaj import: import { CANVAS_BASE_WIDTH } from '@/core/constants';
```

---

## 9. Workflow Rozwoju

1.  **Nowy typ obiektu**:
    - Dodaj `type` do `EditorObject['type']` w `types.ts`.
    - Dodaj renderowanie w `Canvas/ObjectRenderer.tsx`.
    - Dodaj eksport w `useExport.ts` (sekcja `for (const obj of sortedObjects)`).
    - Dodaj kształt PDF w `core/icon-shapes.ts` (jeśli ikona).

2.  **Nowa akcja stanu**:
    - Dodaj typ do `EditorAction` w `types.ts`.
    - Dodaj case do `editorReducer` w `editor-context.tsx`.

3.  **Zmiana formatu zapisu projektu**:
    - Modyfikuj `handleExportProject` w `useExport.ts` i `handleProjectUpload` w `Toolbar.tsx` symetrycznie.

4.  **Nowa stała wymiarowa**:
    - Dodaj do `core/constants.ts` — nigdy jako literał w kodzie komponentu.
