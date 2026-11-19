# Inwentarz UX: przyciski, narzędzia, zależności

Stan kodu na 2026-11-19 (po commicie `cc5e9ca`). Cel: pełna mapa tego, **co jest dostępne, komu, kiedy
i jak elementy od siebie zależą**, jako punkt wyjścia do zaprojektowania UX od nowa. Nazwy elementów
UI podaję tak, jak są w aplikacji (po angielsku). Na końcu (§12) lista niespójności i luk znalezionych
przy analizie.

---

## 1. Wymiary, od których zależy, co widać

Każdy element interfejsu jest włączany przez kombinację tych warunków:

| Wymiar | Wartości | Skąd |
|---|---|---|
| **Rola** | `admin`, `PM`, `TECH` | konto (`useCurrentUser`) |
| **Układ** | **Telefon** (< 768 px szerokości), **Desktop**, **Touch layout** (desktop/tablet z większymi przyciskami) | `useIsMobile()` (automatycznie); Touch layout: przełącznik w menu (domyślnie włączony na urządzeniach dotykowych), zapamiętywany na urządzeniu |
| **Dokument** | brak PDF → lista projektów; PDF wczytany; projekt zapisany na serwerze (`projectId`) lub tylko z pliku | `docState.pdfFile`, `projectId` |
| **Zaznaczenie** | nic / 1 obiekt / wiele obiektów / trasa kablowa / zworka | `selectedObjectIds`, `selectedRouteId`, `selectedJumperId` |
| **Aktywne narzędzie** | `select`, `draw`, `fill`, `measure`, `calibrate`, `path-measure`, `route`, `jumper`, `wall`, `area`, `stamp`, `pan-overlay` | `uiState.tool` |
| **Zawartość planu** | czy jest skala (kalibracja), czy są obiekty CCTV, czy jest IDF (rack), ile IDF, czy jest nakładka PDF | dokument |
| **Typ zaznaczonych obiektów** | tekst, rysunek (`path`), wypełnienie (`fill`), urządzenie kablowe, kamera, obszar pokrycia, rack, ikona/obraz | `EditorObject` |
| **Warstwa obiektu** | zablokowana / nie | `layer.locked` (brak UI do zmiany, patrz §12) |
| **Uprawnienia technika** (per projekt) | dla `move`, `label`, `cables`, `idf`: *Not allowed* / *Change request* / *Without approval* | `lvSettings.techPermissions` |

---

## 2. Mapa ekranów

```
Login (AuthPage) ─────────────► Lista projektów (PDFUploader) ──► Edytor (home.tsx)
   Install app                    │                                 ├─ Telefon
                                  └─ /admin (tylko admin)           ├─ Desktop
                                                                    └─ Desktop + Touch layout
```

### 2.1 Lista projektów (`PDFUploader`)
| Element | Rola | Co robi |
|---|---|---|
| Karta użytkownika (nazwa, rola) | wszyscy | informacja (ukryta < `sm`) |
| **Zarządzaj użytkownikami** | admin | przejście do `/admin` (tekst po polsku, patrz §12) |
| **Logout** | wszyscy | wylogowanie |
| **New Project** (+ karta *Create another project*) | PM, admin | okno: nazwa + PDF → nowy projekt |
| Na karcie projektu: **Open** | wszyscy | otwiera edytor |
| Na karcie: *Shared with me* | — | etykieta, gdy nie jesteś właścicielem |
| Na karcie: **Rename**, **Share**, **Export (.zip)**, **Delete** | PM, admin (pokazane też przy projektach udostępnionych, patrz §12) | zmiana nazwy, udostępnienie (wpisanie nazwy użytkownika), ZIP z serwera, usunięcie (z potwierdzeniem) |
| **More Options**: Import from ZIP / pliku `.json`, otwarcie folderu | PM, admin | import projektu |
| **Export / Import all projects** (`AdminBackup`) | admin | kopia całego serwera |
| **Install app** | wszyscy, gdy przeglądarka pozwala | instalacja PWA |

### 2.2 Admin (`/admin`)
Lista użytkowników, tworzenie kont, zmiana roli, reset hasła, kopia zapasowa serwera.

---

## 3. Edytor na desktopie: górny pasek (rząd 1)

Kolejność od lewej. **T** = widoczne dla technika.

| # | Element | Rola | Warunek widoczności | Działanie | Skrót |
|---|---|---|---|---|---|
| 1 | **☰ Menu** (MainMenu) | wszyscy (T) | zawsze | §5 | — |
| 2 | **Select** (strzałka) | wszyscy (T) | zawsze | narzędzie zaznaczania | `V` |
| 3 | **Path measure** (osobny przycisk) | tylko TECH (T) | zawsze dla technika | pomiar ścieżki | — |
| 4 | **Draw** (ołówek) + ⚙ | PM, admin | — | rysowanie odręczne; ⚙ = kolor, grubość (duplikat opcji z rzędu 2) | `P` |
| 5 | **Fill** (wiadro) + ⚙ | PM, admin | — | wypełnienie zamkniętego obszaru kolorem (trafia na warstwę *Colors*); ⚙ = kolor, krycie | `B` |
| 6 | **Measure** (split button) + ▾ | PM, admin | — | przycisk = ostatnio wybrane: *Measuring tape* (A–B) albo *Path measure*; bez skali tape włącza najpierw *Scale probe* | `M` (tape), `K` (probe) |
| 7 | **Add Text** | PM, admin | — | dodaje tekst na środku widoku; można też przeciągnąć na plan | — |
| 8 | **Add Image** | PM, admin | — | wybór pliku → obraz na planie | — |
| 9 | **Objects** (kwadrat) → popover | PM, admin | otwarcie przełącza narzędzie na Select | *Standard Icons* (8 kształtów), *Low Voltage* (wszystkie urządzenia), *My Icons* (biblioteka zespołu: + dodaj, × usuń z potwierdzeniem). Klik = dodaj na środku widoku, przeciągnięcie = upuść w miejscu. **Z włączonym Auto-numbering klik ikony LV włącza tryb *stamp*** | — |
| 10 | Grupa **Cables**: **Cable route** | PM, admin | — | rysowanie trasy kablowej do IDF | `R` |
| 11 | Grupa **Cables**: **Jumper** | PM, admin | — | zworka między dwoma obiektami | `J` |
| 12 | Grupa **Cables**: **Show cable routes** (oko) | wszyscy (T) | — | pokaż/ukryj trasy (także kropki IDF) | — |
| 13 | Grupa **Cables**: **Jumpers ▾** | wszyscy (T) | — | *Show all jumpers* + filtr typów (aktywny tylko z *Show all*) | — |
| 14 | Grupa **CCTV**: **Blindspot wall** | PM, admin | grupa widoczna **tylko gdy na planie jest kamera, blindspot lub obszar pokrycia** (albo aktywne `wall`/`area`) | ściana blokująca widok kamer | `W` |
| 15 | Grupa **CCTV**: **Camera blindspot** | PM, admin | j.w. | dodaje prostokąt-blindspot | — |
| 16 | Grupa **CCTV**: **Coverage area** | PM, admin | j.w. | obszar, który wybrane kamery mają pokryć (warstwa *CoverageAreas*) | — |
| 17 | Grupa **CCTV**: **Show camera coverage** + ▾ | wszyscy (T) | j.w. | pokaż pokrycie (bez skali: komunikat, nic się nie rysuje); ▾ *One colour*; razem z pokryciem pokazuje/ukrywa warstwę *CoverageAreas* | — |
| — | *(prawa strona)* | | | | |
| 18 | Nazwa projektu | TECH (T) | tylko technik (pozostali mają ją w rzędzie 2) | — | — |
| 19 | **Requests** | wszyscy (T) | projekt zapisany | PM: prośby techników + komentarze bez odpowiedzi (licznik, kolor); TECH: własne oczekujące prośby | — |
| 20 | **Snap** (magnes) | PM, admin | — | przyciąganie do krawędzi/środków przy przeciąganiu (Ctrl/Alt = bez, Shift = kroki 0,5 ft) | — |
| 21 | **Auto-numbering** (#) + ⚙ | PM, admin | — | włącza numerowanie; ⚙ = *Prefix*, *Start #*; wyłączenie wychodzi z trybu stamp | — |
| 22 | **Undo / Redo / History** | PM, admin | — | cofnij, ponów, lista kroków (skok do kroku) | `Ctrl+Z`, `Ctrl+Y` / `Ctrl+Shift+Z` |
| 23 | **Zoom** −, %, ▾, +, **Fit** | wszyscy (T) | — | 10%–1300%; ▾ = 50/100/200/400/750/1000/1300%, *Fit width*, *Fit page* | `Ctrl` + kółko, pinch |
| 24 | Kropka zapisu | PM, admin | projekt zapisany | zielona = zapisane, kręcąca się = zapisywanie | — |

---

## 4. Edytor na desktopie: pasek kontekstowy (rząd 2, `ContextBar`)

**Technik nie ma tego paska.** Ma stałą wysokość (żeby plan nie skakał). Po lewej nazwa stanu, po prawej
nazwa projektu. Treść wybierana **według priorytetu** (pierwszy pasujący wygrywa):

| Priorytet | Warunek | Treść |
|---|---|---|
| 1 | zaznaczony ≥ 1 obiekt **i narzędzie ≠ jumper** | **Edytor obiektu** (`ObjectPropertyEditor`): *Label* (`BulkLabelInput`: wzorce `%1`, przyciski **Chain** i **By IDF** przy wielu obiektach) + pozycja etykiety; dla 1 tekstu: treść, rozmiar, **B**; kolor; dla 1 rysunku: grubość; dla samych wypełnień: krycie; warstwa (nie dla wypełnień); **Delete** / **Delete N** |
| 2 | `draw` | kolor, *Size*, *Freehand / Straight*, *Finger + stylus / Stylus only* (tylko ekrany dotykowe), podgląd pędzla |
| 3 | `fill` | kolor, *Opacity*, przełącznik wejścia (stylus) |
| 4 | `measure` / `calibrate` | *Scale ref* albo „No scale set”; *Any angle / Straight*; przełącznik wejścia; **Probe scale / Re-probe scale / Probing…**; **Clear tape**; **Clear scale** (z potwierdzeniem) |
| 5 | `route` | *Route for*: przyciski IDF w ich kolorach + *Shared (all IDFs)*; bez IDF: ostrzeżenie |
| 6 | `jumper` | *New jumper carries*: wybór kabli (typ × liczba); stan („pick the first object” / „from X — now the other end (n points)”); **Cancel** |
| 7 | `wall` / `area` | *Straight 45° / 90°*, *Sticky*, podpowiedź |
| 8 | `pan-overlay` | podpowiedź + **Done** |
| 9 | na planie jest taśma pomiarowa | długość taśmy + **Clear tape** |
| 10 | nic z powyższych | „Select an object to edit it” / „Tap an object to edit it” |

Osobno, nad planem (nie dla technika): **ToolHint** z instrukcją aktywnego narzędzia (inny tekst dla dotyku).

---

## 5. Menu główne (☰, desktop i tablet)

| Pozycja | Rola | Warunek | Działanie |
|---|---|---|---|
| Karta użytkownika | wszyscy | zalogowany | — |
| **All projects** | wszyscy | — | powrót do listy |
| **Save project** | PM, admin | PDF wczytany | ręczny zapis (przy projekcie z serwera i tak działa autozapis) |
| **Share project** | PM, admin | — | okno udostępnienia (wpisanie nazwy użytkownika) |
| **Technician permissions…** | PM, admin | — | macierz uprawnień techników (§9) |
| **Open project file** (.json/.zip) | PM, admin | — | import |
| **Open project folder** | PM, admin | — | import z folderu |
| **Replace blueprint PDF…** | PM, admin | PDF wczytany | nowa wersja rysunku, obiekty zostają (z potwierdzeniem) |
| **Overlay blueprint…** (*on*) | wszyscy (T) | — | okno nakładki: wczytaj / zamień / usuń PDF, *Transparency*, *Alignment* (przeciąganie → narzędzie `pan-overlay`, strzałki, reset) |
| **Cable summary…** | wszyscy (T) | — | panel: zestawienie per IDF, urządzenia bez kabli, postęp kabli, pudełka Cat6, zmiany planu, wysokość sufitu/racków |
| **Show mount heights** ☑ | wszyscy (T) | — | wysokości montażu przy etykietach (plan i PDF) |
| **Export PDF** | wszyscy (T) | — | okno: nazwa pliku, papier, orientacja, *Label size*, *Include cable summary*, *Whole page (no crop)* albo kadrowanie na planie (krok `crop`) |
| **Export project files (.zip)** | PM, admin | — | kopia/transfer |
| *Label size (plan & PDF)* (suwak) | wszyscy (T) | — | rozmiar etykiet na planie i w PDF; zapisywany w projekcie przez PM, u technika (który nie zapisuje planu) zmienia się tylko na jego ekranie |
| **Touch layout** ☑ | wszyscy (T) | — | większe przyciski, pasek akcji przy obiekcie, plywający panel |
| **Install app** | wszyscy | przeglądarka pozwala | PWA |
| **Log out** | wszyscy | — | — |

---

## 6. Panele boczne (desktop / tablet)

### 6.1 Lewy: *Layers & progress* (`LayerPanel`)
Domyślnie ukryty w Touch layout, pamiętany na urządzeniu; zwinięty → przycisk **Layers** w rogu planu.

| Element | Rola | Działanie |
|---|---|---|
| **×** (Hide panel) | wszyscy | zwija panel |
| **Progress** (zwijany, pamiętany) | wszyscy | pasek postępu, liczniki statusów, ☑ *Color by status* |
| **+** (Add layer) | PM, admin | nowa warstwa |
| Wiersz warstwy: klik | wszyscy | aktywna warstwa (tu trafiają nowe obiekty) |
| ▸/▾ | wszyscy | rozwiń / zwiń obiekty |
| 👁 | wszyscy | widoczność warstwy |
| 🗑 | PM, admin | usuń warstwę (nie ostatnią; bez potwierdzenia, cofnięcie przez Undo) |
| podwójny klik na nazwie | PM, admin | zmiana nazwy |
| Wiersz obiektu: klik / Ctrl+klik / Shift+klik | wszyscy | zaznacz / dodaj do zaznaczenia / zakres |
| podwójny klik na nazwie obiektu | PM, admin | zmiana nazwy |
| kropka statusu, liczba zdjęć | — | informacja |
| 🗑 przy obiekcie | PM, admin | usuń (widoczne na hover / zaznaczeniu / ekranach bez hover) |
| **Przeciąganie obiektu** | PM, admin (mysz, HTML5 DnD) | zmiana kolejności (= kolejność rysowania) i/lub warstwy; zaznaczony obiekt ciągnie całe zaznaczenie |

**Brak w UI:** blokowanie warstwy, zmiana kolejności warstw, krycie warstwy (patrz §12).

### 6.2 Prawy: *Object Properties* (`PropertiesPanel`)
Widoczny, gdy coś jest zaznaczone. **Touch layout:** nie otwiera się sam przy zaznaczeniu jednego
obiektu (otwiera go *Props* z paska akcji albo długie przytrzymanie); przy wielu obiektach otwiera się
od razu; pływa nad planem i ma **×**.

Sekcje i warunki (**ro** = tylko odczyt dla technika):

| Sekcja | Warunek | PM / admin | TECH |
|---|---|---|---|
| Nagłówek: tytuł, *Bulk Edit*, 🗑 | — | usuń zaznaczone | brak 🗑 |
| **Label** + pozycja etykiety | — | `BulkLabelInput` z podglądem, przyciski *Number by nearest neighbour* / *Number by distance to IDF* | `TechLabelInput`: zmiana nazwy = prośba (lub od razu, zależnie od uprawnień); pozycja etykiety lokalnie |
| **Progress Status** (6 przycisków) | żaden zaznaczony nie jest tekstem | tak | tak |
| *Issue Description* | któryś ma status Issue | tak | tak |
| *Last updated* | 1 obiekt ze statusem | — | — |
| Prośba technika (`TechRequestSection`) | 1 obiekt | zatwierdź / odrzuć | anuluj własną |
| **Plan change** (`PlanChangeSection`) | nie tekst | tak | ro |
| *Switch ID*, *Cable ID* | — | edycja | ro |
| **Mount height**, **Cables**, **IDF** | wszystkie zaznaczone to urządzenia kablowe | edycja | ro; IDF jako prośba (dla 1 obiektu) |
| **Jumpers** (`JumperEditor`) | 1 obiekt, ikona lub obraz | pełna edycja, *+ Jumper* (włącza narzędzie od tego obiektu) | tylko przełącznik *Pulled* |
| **Camera coverage** | wszystkie to kamery | edycja | ro |
| **Coverage area cameras** (+ automatyczne rozmieszczenie kamer) | wszystkie to obszary pokrycia | edycja | ro |
| *X Pos*, *Y Pos* | 1 obiekt | edycja | ro |
| **Resize by %** (−10%, +10%, dowolny) | — | tak | — |
| **Replace object** | — | zamiana typu urządzenia | — |
| *Opacity*, *Object Color*, *Stroke Width* (rysunek) | zależnie od typu | edycja | ro |
| **Photos** (galeria, dodawanie) | 1 obiekt | tak | tak |
| **Comments** | 1 obiekt | tak | tak |
| **Delete Object(s)** na dole | — | tak | — |

---

## 7. Interakcje na planie

### 7.1 Mysz (desktop)
| Akcja | Narzędzie | Efekt |
|---|---|---|
| Klik w obiekt | select | zaznacz; **Ctrl/⌘+klik** = dodaj/odejmij |
| Przeciągnięcie obiektu | select | przesunięcie (snap; **Shift** = kroki 0,5 ft; **Ctrl/Alt** = bez snapu). **Brak uchwytów zmiany rozmiaru** |
| Uchwyt obrotu (nad obiektem) | select, 1 obiekt | klik = 45°, przeciągnięcie = dowolnie |
| Przeciągnięcie etykiety | select | pozycja etykiety (technik: tylko u siebie) |
| Przeciągnięcie po pustym planie | select | zaznaczenie ramką |
| Klik w pusty plan | select | odznacz |
| Klik w trasę / zworkę | select | zaznacz trasę / zworkę (popover: IDF trasy / edycja zworki, *Go to* drugi koniec, 🗑) |
| **Spacja + przeciągnięcie** | każde | przesuwanie widoku |
| **Ctrl + kółko** | każde | zoom wokół kursora |
| Upuszczenie z menu Objects / tekstu | — | obiekt w miejscu upuszczenia |

### 7.2 Klawiatura (PM, admin; technik nie ma żadnych skrótów edycyjnych)
| Klawisz | Warunek | Efekt |
|---|---|---|
| `V` `P` `B` `M` `K` `R` `J` `W` | **nic nie jest zaznaczone** | narzędzia: select, draw, fill, measure (bez skali → probe), probe, route, jumper, wall |
| dowolna litera/cyfra | **coś jest zaznaczone** | przenosi fokus do pola *Label* (nadpisuje skróty narzędzi!) |
| `Esc` | narzędzie ≠ select | powrót do Select (nakładka, jumper, path measure mają własne Esc) |
| `Delete` / `Backspace` | zaznaczona zworka / obiekty / trasa | usuń (w *path measure* Backspace cofa punkt) |
| strzałki | zaznaczone obiekty, narzędzie select | przesuń o 2 px ekranu (**Shift** = 10 px) |
| `Ctrl` + strzałka | j.w. | obrót o 45° |
| `+` / `−` | j.w. | rozmiar ±10% |
| `Ctrl+C` / `Ctrl+V` | — | kopiuj / wklej pod kursorem |
| `Ctrl+Shift+V` | — | wklej z kolejnym numerem |
| `Ctrl+Z`, `Ctrl+Y` / `Ctrl+Shift+Z` | — | cofnij / ponów |
| `Enter`, `Backspace`, `Esc`, podwójny klik | route, wall, area, jumper, path measure | zakończ / cofnij punkt / anuluj (różnie per narzędzie, patrz ToolHint) |

### 7.3 Dotyk (Touch layout, tablet)
| Gest | Efekt |
|---|---|
| tap w obiekt | zaznacz (drugi tap po zaznaczeniu nie trafia w świeżo pojawiony przycisk) |
| **double tap** | **duplikat z kolejnym numerem** (gdy wolno), inaczej zaznacz |
| **long press** | zaznacz + otwórz właściwości; **technik** (gdy może zmieniać etykietę/kable): formularz prośby `TechEditDialog` |
| przeciągnięcie zaznaczonego | przesuń (niezaznaczonego nie da się przeciągnąć) |
| **pasek akcji** nad zaznaczonym obiektem (1 obiekt, select) | **Copy** (duplikat), **45°**, **Props**, **Delete** (według uprawnień) |
| 2 palce | pinch zoom i przesuwanie |
| *Stylus only* | palec przesuwa/zoomuje, rysuje tylko rysik |

---

## 8. Narzędzia: wejście, wyjście, zależności

| Narzędzie | Jak włączyć | Wymaga | Co robi klik / gest | Wyjście |
|---|---|---|---|---|
| `select` | przycisk, `V`, `Esc`, wybór z menu Objects | — | §7 | — |
| `draw` | przycisk, `P` | — | pociągnięcie = linia (Shift / *Straight* = prosta) | przycisk, `Esc` |
| `fill` | przycisk, `B` | PDF | klik wewnątrz zamkniętego obszaru; > 50% strony → pytanie | j.w. |
| `measure` | przycisk / menu, `M` | **skala** (bez niej → `calibrate`) | jedna taśma A–B, zostaje na planie | j.w.; *Clear tape*, `Esc` |
| `calibrate` | *Probe scale*, `K`, auto z `measure` | — | linia + długość w stopach → skala zapisana w projekcie | po ustawieniu skali → `measure` |
| `path-measure` | menu pomiaru (PM), osobny przycisk (TECH, telefon) | skala do pokazania długości (punkty można stawiać bez niej) | punkt po punkcie; telefon: tap = punkt, przytrzymanie = usuń; nie zapisywane | przycisk, `Esc` |
| `route` | przycisk, `R` | IDF, żeby wybrać dla kogo (inaczej *Shared*) | punkty kontrolne; start/koniec na racku lub innej trasie | Enter / podwójny klik / tap ostatniego punktu |
| `jumper` | przycisk, `J`, *+ Jumper* w Properties | 2 obiekty (ikona/obraz) | pierwszy obiekt → punkty → drugi obiekt | `Esc`, *Cancel* |
| `wall` | przycisk, `W` | — (grupa CCTV musi być widoczna, ale klawisz działa zawsze) | narożniki ściany | Enter / podwójny klik |
| `area` | przycisk | — (grupa CCTV) | narożniki obszaru; zamyka się sam | Enter / Esc / pierwszy punkt |
| `stamp` | **ukryte:** włączony Auto-numbering + klik ikony LV w menu Objects | Auto-numbering, aktywna warstwa | każdy klik stawia kolejny numerowany obiekt (`prefix` + licznik) | wyłączenie Auto-numbering, `Esc`, inne narzędzie |
| `pan-overlay` | *Overlay blueprint… → Alignment* | nakładka PDF | przeciąganie nakładki, strzałki | *Done*, `Esc` |

**Sprzężenia między narzędziami i ustawieniami:**
- *Freehand / Straight* (`drawStraight`) jest wspólne dla ołówka i pomiaru (odznaka na obu przyciskach).
- *Finger + stylus / Stylus only* jest jednym ustawieniem dla wszystkich narzędzi.
- Otwarcie menu *Objects* zawsze przełącza na Select.
- Technikowi każde narzędzie inne niż Select i Path measure jest od razu wyłączane.
- Pokazanie pokrycia kamer pokazuje też warstwę *CoverageAreas* (i odwrotnie przy ukryciu).
- Kropki IDF przy obiektach są widoczne tylko przy ≥ 2 IDF **i** włączonych trasach.
- Wypełnienia zawsze trafiają na warstwę *Colors*, obszary pokrycia na *CoverageAreas* (tworzone automatycznie).
- Status urządzenia ≥ *pulled* jest **pokazywany** jako *Planned*, dopóki zworki przy nim nie są *pulled*.

---

## 9. Technik (TECH)

| Obszar | Desktop / tablet | Telefon |
|---|---|---|
| Narzędzia | Select, Path measure; widoczność tras, zworek, pokrycia | Path measure w nagłówku; widoczność w menu ☰ |
| Pasek kontekstowy, ToolHint, Undo, Snap, Auto-numbering | brak | brak |
| Status, Issue, zdjęcia, komentarze | Properties | dolny pasek |
| Etykieta | pole = prośba / zmiana według uprawnień | long press → formularz |
| Przesunięcie | przeciąganie, jeśli `move` ≠ *Not allowed* (prośba albo od razu) | **Request move** / **Move** |
| Kable, IDF | prośba / zmiana według uprawnień | long press → formularz |
| Zworki | przełącznik *Pulled* | chip *⇄ n/m pulled* → arkusz, *Mark all pulled* |
| Pozycja etykiety | tylko na swoim ekranie | — |
| Prośby | **Requests** (własne oczekujące) | **Requests** |
| Eksport | PDF (bez ZIP) | PDF (bez ZIP) |

Uprawnienia (*Technician permissions…*, PM/admin): dla **location, label, cables, IDF** osobno
*Not allowed* / *Change request* / *Without approval*. Dla zmiany bez zatwierdzenia PM widzi, kto ją zrobił.

---

## 10. Telefon (< 768 px)

**Nagłówek:** ☰ · nazwa projektu · **Path measure** · **Requests** · kropka zapisu (PM/admin) ·
**Save** (tylko projekt z pliku, jeszcze niezapisany; nie TECH) · **Export PDF** (ikona) · **ZIP** (ikona; nie TECH).

**Menu ☰ (wysuwane z lewej):** użytkownik · **All projects** · **Install app** · *Show*: *Color by status*,
*Camera coverage* (tylko gdy są obiekty CCTV), *Cable routes*, *All jumpers* · *Layers*: przełącznik
widoczności każdej warstwy · **Log out**.

**Dolny pasek: nic nie zaznaczone:** ☑ *By status* · „Tap an object” · **+ Add** (nie TECH).

**Dolny pasek: obiekt zaznaczony:**
| Element | Rola | Warunek |
|---|---|---|
| Nazwa + szczegóły (tap → arkusz `PMObjectDetailsPanel`: etykieta, notatka, prośba, zmiana planu, IDF, wysokość, kable, zworki, pokrycie, zdjęcia, komentarze) | **tylko rola `PM`** (admin nie, patrz §12) | — |
| chip kabli / zworek | wszyscy | gdy obiekt je ma |
| 🗑 (z potwierdzeniem) | PM, admin | warstwa niezablokowana |
| ✕ odznacz | wszyscy | — |
| Statusy (jeden rząd przewijany w bok) | wszyscy | nie tekst; Issue → okno z komentarzem; *pulled* przy niezaciągniętych zworkach → pytanie „Jumpers pulled too / Only X” |
| **Photo** (aparat), **Photos (n)** | wszyscy | — |
| **Copy** (duplikat z numerem) | PM, admin | nie wypełnienie/rysunek, warstwa niezablokowana |
| **Move** / **Request move** → tap w nowe miejsce | wszyscy wg uprawnień | nie wypełnienie/rysunek |
| **Add** → arkusz z urządzeniami LV | PM, admin | — |

Na telefonie **nie ma**: przeciągania obiektów, Undo/Redo, rysowania, wypełnień, tras, ścian, zworek,
taśmy, edycji warstw, menu Objects (tylko urządzenia LV), eksportu kabli/nakładki/uprawnień.

---

## 11. Okna dialogowe i panele modalne

| Okno | Otwierane z | Rola |
|---|---|---|
| New Project, Rename, Share (lista) | lista projektów | PM, admin |
| Share project | menu ☰ | PM, admin |
| Technician permissions | menu ☰ | PM, admin |
| Overlay blueprint | menu ☰ | wszyscy |
| Cable summary | menu ☰ | wszyscy |
| Export PDF (+ krok kadrowania na planie) | menu ☰, ikona na telefonie | wszyscy |
| Auto-place cameras (+ podgląd propozycji na planie: zastosuj / zmień / anuluj) | Properties obszaru pokrycia | PM, admin |
| *Who is who?* (import z innego serwera), Imported people | import ZIP, Share | PM, admin |
| TechRequestDialog („send as request?”) | zmiana technika wymagająca zatwierdzenia | TECH |
| TechEditDialog (formularz long press) | long press | TECH |
| Requests (lista próśb i komentarzy) | przycisk Requests | wszyscy |
| Photo gallery | Properties, telefon | wszyscy |
| Install app (kroki dla Safari) | Install app | wszyscy |
| `window.confirm`: usunięcie projektu, ikony z biblioteki, skali, zamiana PDF, wypełnienie > 50%, usunięcie obiektu (telefon), komentarza | różne | — |

---

## 12. Niespójności i luki (do decyzji przy projektowaniu UX)

**Funkcje bez interfejsu albo martwe**
1. **Blokowanie warstw, kolejność warstw, krycie warstw**: README obiecuje *lock, reorder, set opacity*, a w UI nie ma żadnego z nich. Reducer obsługuje `locked` i `REORDER_LAYERS`, a zablokowana warstwa jest respektowana w wielu miejscach, ale nie da się jej zablokować. `layer.opacity` w ogóle nie jest rysowane.
2. Narzędzia `text`, `image`, `icon` istnieją w typie `tool`, ale nic ich nie włącza. Edycja tekstu bezpośrednio na planie (`contentEditable` tylko przy `tool === 'text'`) jest więc nieosiągalna; tekst edytuje się w pasku kontekstowym.
3. Tryb **stamp** (stemplowanie numerowanych obiektów) nie ma własnego przycisku. Włącza się tylko kombinacją *Auto-numbering* + klik ikony LV w *Objects*.

**Dwa systemy tam, gdzie wystarczyłby jeden**
4. Numeracja: *Auto-numbering* (prefix + licznik, stempel, duplikat) i wzorce `%1` w polu Label (z *Chain* / *By IDF*). Działają niezależnie, mają inną składnię i inne miejsca w UI.
5. Ustawienia pędzla i wypełnienia są w dwóch miejscach: popover ⚙ przy przycisku i pasek kontekstowy.
6. Udostępnianie: wpisywanie nazwy użytkownika (lista projektów, menu), choć serwer ma katalog użytkowników (`/api/users/directory`, używany przy imporcie).
7. Usuwanie obiektu jest w 6 miejscach: pasek kontekstowy, nagłówek Properties, dół Properties, pasek akcji (dotyk), lista warstw, klawisz. Potwierdzenie jest tylko na telefonie, który z kolei **nie ma Undo**.

**Uprawnienia i widoczność**
8. Lista projektów pokazuje *Rename / Share / Delete* każdemu PM, także przy projektach **udostępnionych** (*Shared with me*), choć serwer pozwala na to tylko właścicielowi. Kliknięcie kończy się błędem.
9. Telefon: szczegóły obiektu (tap w nazwę) otwierają się tylko dla roli `PM`. **Admin ich nie dostaje**, choć wszędzie indziej ma co najmniej uprawnienia PM.
10. Grupa **CCTV** pojawia się dopiero, gdy na planie jest kamera, blindspot albo obszar. Ściany i obszary są niewidoczne, dopóki nie doda się kamery z *Objects → Low Voltage*. Skrót `W` działa jednak zawsze.
11. Gdy coś jest zaznaczone, skróty narzędzi (`V`, `P`, `M`…) nie działają: litera trafia do pola Label. To mocna, ale ukryta funkcja, sprzeczna z intuicją „V = select”.
12. Technik na desktopie nie ma paska kontekstowego ani ToolHint, więc nic mu nie podpowiada, co zrobić po zaznaczeniu (wszystko jest w Properties).

**Spójność języka i form**
13. „Zarządzaj użytkownikami” to jedyny polski tekst w angielskim UI (lista projektów).
14. *Touch layout* jest ręcznym przełącznikiem w menu, a układ telefonu włącza się automatycznie od szerokości. Są więc trzy układy z różnymi zestawami funkcji (§10 vs §3–§7), a nie jeden responsywny.
15. Przełączniki ustawień mają wariant `switch` (jasny odcień), a narzędzia są pełnym przyciskiem. Wyjątkiem jest *Objects*, który świeci tylko przy otwartym menu.
16. `Esc` znaczy różne rzeczy: wyjście z narzędzia, anulowanie zworki, usunięcie pomiaru ścieżki, zakończenie obszaru, *Done* przy nakładce.

**Zależności, które warto pokazać w UI**
17. Skala jest wymagana przez taśmę, długości pomiaru ścieżki i zworek, pokrycie kamer oraz długości kabli. Dziś jedyną informacją jest toast w chwili użycia.
18. IDF jest wymagany przez kolor trasy, numerację *By IDF*, kropki IDF (≥ 2) i podsumowanie kabli.
19. Aktywna warstwa (klik w panelu warstw) decyduje, gdzie trafiają nowe obiekty. Przy ukrytym panelu (domyślnie w Touch layout) nie widać, która to warstwa.
