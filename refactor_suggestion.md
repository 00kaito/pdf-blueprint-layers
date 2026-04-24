1. Rozdzielenie Matematyki PDF od Logiki Reacta (Domain Isolation)
   Obecnie wzory mapowania współrzędnych i konwersja SVG są "wymieszane" z kodem UI w Toolbar.tsx.
* Propozycja: Stworzenie czystej warstwy usługowej (np. src/lib/pdf/coordinate-engine.ts).
* Zaleta: Możesz napisać testy jednostkowe (Jest/Vitest) dla samego przeliczania punktów bez renderowania całego edytora. Jeśli w przyszłości zmienisz bibliotekę z pdf-lib na inną, zmienisz tylko jeden plik.

2. Dekompozycja Komponentów (Atomic Design)
   Toolbar.tsx i Canvas.tsx mają po 800+ linii kodu. To sprawia, że są trudne do czytania.
* Propozycja:
    * Toolbar: Rozbicie na mniejsze fragmenty: ExportTools, ObjectTools, StampSettings, ZoomControls.
    * Canvas: Wydzielenie ObjectRenderer.tsx, który zajmuje się tylko rysowaniem konkretnego typu obiektu (Rnd + zawartość).
    * Overlay: Wydzielenie OverlaySystem.tsx jako niezależnego komponentu renderującego podkłady.

3. Wprowadzenie Specjalistycznych Hooków (Logic Extraction)
   Zamiast trzymać całą logikę "co się dzieje po kliknięciu" wewnątrz komponentu, należy wyprowadzić ją do dedykowanych hooków.
* Propozycja:
    * usePDFLoader: Zarządzanie ładowaniem głównego i overlay PDF.
    * useObjectManipulation: Logika dodawania, kopiowania i usuwania obiektów.
    * useExportEngine: Cały proces svgToPng i budowania finalnego dokumentu.
* Zaleta: Komponenty Reactowe stają się "głupie" (tylko wyświetlają dane), co ułatwia debugowanie.

4. Modularyzacja Stanu (State Slicing)
   Obecny EditorContext przechowuje wszystko – od bajtów pliku po pozycję scrolla.
* Propozycja: Podział na mniejsze konteksty lub użycie biblioteki typu Zustand (która świetnie radzi sobie z częstymi aktualizacjami, np. przy drag & drop).
    * DocumentStore: Pliki PDF, strony, skala.
    * ObjectStore: Warstwy i elementy (tu odbywa się najwięcej zmian).
    * UIStore: Aktywne narzędzie, stan modali, pozycje paneli.

  ---

Przykładowa struktura po refaktorze:

    1 src/
    2 ├── core/               # "Mózg" aplikacji (niezależny od Reacta)
    3 │   ├── pdf-math.ts     # Mapowanie współrzędnych
    4 │   ├── svg-utils.ts    # Przetwarzanie wektorów
    5 │   └── constants.ts
    6 ├── hooks/              # Logika biznesowa
    7 │   ├── useExport.ts
    8 │   ├── useDrawing.ts
    9 │   └── usePDFSync.ts
10 ├── components/         # Czysty UI
11 │   ├── editor/
12 │   │   ├── Canvas/
13 │   │   │   ├── ObjectRenderer.tsx
14 │   │   │   └── PDFLayer.tsx
15 │   │   └── Toolbar/
16 │   │       ├── ToolGroup.tsx
17 │   │       └── ExportButton.tsx
18 │   └── ui/             # Shadcn (bazowe komponenty)
19 └── store/              # Zarządzanie stanem (Slices)

Dlaczego to jest lepsze?
1. Testowalność: Możesz przetestować logikę eksportu bez uruchamiania przeglądarki.
2. Prędkość: Mniejsze komponenty = mniej zbędnych re-renderów. Obecnie każda zmiana scrolla może wymuszać przeliczenie całego Toolbaru.
3. Onboarding: Nowy deweloper, chcąc naprawić błąd w etykietach, idzie do ObjectRenderer.tsx, a nie przebija się przez 1000 linii w Canvas.tsx.