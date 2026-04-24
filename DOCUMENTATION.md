# Pełna Dokumentacja Techniczna: PDF Blueprint Layers Editor

## 1. Struktura Projektu (Directory Structure)

```text
client/src/
├── components/         # Komponenty interfejsu użytkownika
│   ├── editor/         # Główny edytor
│   │   ├── Canvas/     # Podkomponenty płótna (ObjectRenderer, DrawingLayer, itp.)
│   │   ├── Canvas.tsx  # Orkiestrator widoku blueprintu
│   │   ├── Toolbar.tsx # Narzędzia i akcje
│   │   └── ...         # Panele boczne i uploader
│   └── ui/             # Bazowe komponenty Shadcn UI
├── core/               # Czysta logika biznesowa (niezależna od Reacta)
│   ├── constants.ts    # Globalne stałe
│   ├── pdf-math.ts     # Transformacje współrzędnych PDF
│   ├── svg-utils.ts    # Manipulacja wektorami i konwersja obrazów
│   └── icon-shapes.ts  # Definicje geometrii ikon
├── hooks/              # Reużywalna logika (Custom Hooks)
│   ├── useExport.ts    # Silnik generowania plików
│   ├── useDrawing.ts   # Silnik rysowania odręcznego
│   └── useObjectCreation.ts # Silnik dodawania elementów
└── lib/                # Konfiguracja i typy
    ├── editor-context.tsx # Zarządzanie stanem (Document & UI)
    ├── types.ts           # Definicje interfejsów TypeScript
    └── utils.ts           # Narzędzia pomocnicze (np. debounce)
```

---

## 2. Moduły Core (`src/core/`)

### 2.1. pdf-math.ts
Służy do tłumaczenia świata "ekranowego" na świat "drukarski" (PDF).

*   **`hexToRgb(hex: string): RGB`**
    - Konwertuje kolor HEX na obiekt RGB akceptowany przez `pdf-lib`.
*   **`getPhysicalCoords(vx, vy, pW, pH, rotation)`**
    - Mapuje współrzędne wizualne edytora na fizyczne punkty PDF (72 DPI).
    - Uwzględnia rotację strony (`/Rotate`).
*   **`getVisualDimensions(pW, pH, rotation)`**
    - Oblicza wymiary "widziane" przez użytkownika na podstawie fizycznego MediaBox i kąta obrotu.

### 2.2. svg-utils.ts
*   **`scalePath(pathData: string, scale: number): string`**
    - Przeskalowuje ścieżkę SVG (np. rysunek odręczny) przy zmianie Zoomu bez utraty jakości.
*   **`svgToPng(svgDataUrl, targetWidth, targetHeight): Promise<string>`**
    - Renderuje wektor SVG na niewidocznym płótnie i eksportuje jako PNG 300DPI (skala 4x).
    - Kluczowe dla wstawiania ostrych ikon do dokumentu PDF.

### 2.3. icon-shapes.ts
*   **`buildIconPath(iconType, w, h, minSide, offX, offY): string | null`**
    - Zwraca ciąg komend SVG dla danego typu ikony (Square, Camera, Triangle, itp.).
    - Używane wspólnie przez UI i silnik eksportu.

---

## 3. Zarządzanie Stanem (`src/lib/`)

### 3.1. editor-context.tsx (Context Split Pattern)
System używa dwóch osobnych kontekstów dla optymalizacji wydajności:

*   **`DocumentContext`**: Przechowuje dane projektu (pliki, warstwy, obiekty).
*   **`UIContext`**: Przechowuje stan interfejsu (Zoom, Scroll, aktywne narzędzie).

**Kluczowe Akcje Reducera:**
*   `SET_PDF`: Inicjalizuje projekt z nowym plikiem.
*   `SET_SCROLL`: Aktualizuje pozycję widoku (używa debouncingu).
*   `UPDATE_OBJECT`: Implementuje niemutowalną aktualizację parametrów elementu.
*   `IMPORT_PROJECT`: Wykonuje głęboką synchronizację stanu z pliku JSON.

---

## 4. Custom Hooks (`src/hooks/`)

### 4.1. useExport
Izoluje ciężkie operacje zapisu.
*   **`handleExportProject()`**: Generuje JSON zawierający wszystkie warstwy, obiekty, własne ikony i ustawienia.
*   **`handleFlattenAndDownload()`**: Główny proces budowania PDF. Wykonuje iterację po warstwach, stosuje transformacje macierzy dla każdego obiektu i "wypala" je na stronie.

### 4.2. useObjectCreation
Zarządza dodawaniem elementów.
*   **`getCenterPosition(w, h)`**: Zwraca współrzędne `(x, y)` w przestrzeni dokumentu, które znajdują się na środku aktualnie widzianego przez użytkownika obszaru.
*   **`handleAddIcon(iconType)`**: Tworzy nowy obiekt ikony, automatycznie skalując go względem aktualnego Zoomu.

### 4.3. useDrawing
Silnik wektorowy.
*   **`onMouseMove(e)`**: Dynamicznie buduje ciąg `pathData`. Obsługuje przyciąganie do osi (Constraint) przy wciśniętym klawiszu Shift.
*   **`onMouseUp()`**: Przekształca tymczasową ścieżkę w trwały obiekt typu `path` na aktywnej warstwie.

---

## 5. Kluczowe Komponenty (`src/components/editor/`)

### 5.1. ObjectRenderer.tsx
Najbardziej interaktywny komponent.
*   Opakowuje element w `react-rnd`.
*   **Logika obrotu**: Obsługuje "szarpanie" za uchwyt nad obiektem. Implementuje snapping co 45 stopni.
*   **Inline Editing**: Używa `contentEditable` dla tekstu, co pozwala na bezpośrednią edycję bez modali.
*   **Counter-Rotation**: Obraca etykietę o `-angle` obiektu, dzięki czemu napisy pod ikonami są zawsze poziome dla użytkownika.

### 5.2. Canvas.tsx
Pełni rolę orkiestratora warstw.
*   Zarządza nakładaniem dokumentu głównego, nakładki (Overlay) oraz warstwy rysunkowej (DrawingLayer).
*   Implementuje `debounce` dla zdarzenia `onScroll`, co chroni stan przed zbyt częstymi aktualizacjami.

---

## 6. Algorytmy i Logika Biznesowa

### 6.1. System Współrzędnych (Visual vs Physical)
Aplikacja operuje na dwóch systemach:
1.  **Visual Space**: 600px szerokości bazowej, Y-down (0,0 w lewym górnym rogu).
2.  **PDF Space**: Punkty typograficzne (pt), Y-up (0,0 w lewym dolnym rogu).

**Konwersja dla obróconych stron (np. 270°):**
`px = width - visualY`
`py = height - visualX`
*(Szczegółowe wzory znajdują się w `pdf-math.ts`)*.

### 6.2. Word-Wrap w PDF
Ponieważ biblioteka `pdf-lib` nie obsługuje automatycznego zawijania tekstu, `useExport` implementuje własny algorytm:
1.  Podział ciągu na słowa.
2.  Mierzenie szerokości tekstu (`font.widthOfTextAtSize`).
3.  Przenoszenie słowa do nowej linii po przekroczeniu `maxWidth` ramki obiektu.
4.  Rysowanie każdej linii jako osobnej instrukcji tekstowej w PDF.
