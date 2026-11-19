# Rekomendacje UI/UX

Na podstawie `UX_INVENTORY.md` (odwołania w nawiasach, np. *Inw. §12.7*, wskazują jego sekcje i punkty).
Każda rekomendacja ma uzasadnienie w uznanej zasadzie projektowej, priorytet i szacunek nakładu:

- **Priorytet:** **P1** = wyraźnie przeszkadza albo prowadzi do błędów; **P2** = duża poprawa zrozumiałości; **P3** = dopracowanie.
- **Nakład:** **S** = godziny; **M** = 1–3 dni; **L** = tydzień lub więcej / przebudowa.

---

## 0. Punkt wyjścia: dla kogo i do czego

Aplikacja obsługuje dwie różne prace, a dziś jeden interfejs próbuje robić obie:

| | **PM / admin: projektowanie** | **Technik: praca w terenie** |
|---|---|---|
| Urządzenie | komputer, czasem iPad | telefon, czasem tablet |
| Kontekst | biurko, skupienie, mysz i klawiatura | budynek, jedna ręka, rękawice, słaby zasięg, światło |
| Główne zadania | rozstawić urządzenia, ponumerować, poprowadzić kable, CCTV, wyeksportować | znaleźć obiekt, zmienić status, zrobić zdjęcie, zgłosić problem lub zmianę |
| Częstotliwość | długie sesje, setki obiektów | krótkie, powtarzalne akcje |

**Zasada nadrzędna:** projektować dwa interfejsy pod te dwie prace, zamiast jednego z ukrywanymi
przyciskami. Dziś układ zależy od trzech osi naraz: roli, szerokości ekranu i trybu dotykowego
(*Inw. §12.14*). To trudne w utrzymaniu i dla użytkownika nieprzewidywalne.

---

## 1. Dziesięć najważniejszych zmian

| # | Zmiana | Zasada | Prio | Nakład |
|---|---|---|---|---|
| 1 | **Pasek stanu na dole edytora**: aktywna warstwa, skala, zoom, przyciąganie, numeracja, zapis | widoczność stanu systemu | P1 | S |
| 2 | **Usuwanie bez okienek potwierdzeń, za to z „Cofnij” w toaście**; cofanie także na telefonie | kontrola i swoboda użytkownika, odwracalność zamiast pytania | P1 | M |
| 3 | **Jeden system numeracji** zamiast dwóch (*Auto-numbering* i wzorce `%1`) | spójność, rozpoznawanie zamiast przypominania | P1 | M |
| 4 | **Narzędzia zawsze widoczne**, a niedostępne wyszarzone z powodem (CCTV, taśma bez skali) | widoczność, zapobieganie błędom | P1 | S |
| 5 | **Uprawnienia odzwierciedlone w UI**: nie pokazywać akcji, których serwer odmówi; naprawić admina na telefonie | zapobieganie błędom | P1 | S |
| 6 | **Panel warstw z pełnymi funkcjami**: blokada, kolejność, krycie (dziś ich nie ma) | zgodność z modelem i dokumentacją | P1 | M |
| 7 | **Lista kontrolna konfiguracji projektu** (PDF, skala, IDF, warstwy, uprawnienia) | stopniowe odsłanianie, prowadzenie użytkownika | P2 | M |
| 8 | **Przestrzenie robocze**: *Plan*, *Kable*, *CCTV*, *Postęp* zamiast jednego długiego paska | stopniowe odsłanianie, minimalizm | P2 | L |
| 9 | **Skróty klawiszowe działające zawsze** + ściągawka pod `?` | elastyczność, spójność | P2 | S |
| 10 | **Telefon zbudowany pod technika**: wyszukiwanie obiektu, lista „do zrobienia”, duże statusy | dopasowanie do zadania, prawo Fittsa | P2 | L |

Szczegóły poniżej, ułożone według obszarów.

---

## 2. Widoczność stanu: co się dzieje i od czego zależy

### 2.1 Pasek stanu (P1, S)
Dziś ważny stan jest rozproszony albo niewidoczny. Aktywną warstwę widać tylko w zwiniętym panelu.
Skalę widać tylko w narzędziu pomiaru. Kropka zapisu nie ma tekstu (*Inw. §12.17–19*).

**Propozycja:** cienki pasek na dole planu (desktop i tablet):

```
[■ Warstwa: Data drops ▾]  [📏 Skala: 1" = 8' ▾ | ⚠ Brak skali – ustaw]  [🧲 Przyciąganie]  [# CAM-%01 → 14]  ···  [100% ▾]  [✓ Zapisano 14:02]
```

- **Warstwa** jako lista rozwijana: wybór aktywnej warstwy bez otwierania panelu.
- **Skala**: przy braku skali bursztynowe ostrzeżenie z akcją *Ustaw skalę*. Tu powinna też trafić wiedza, co bez niej nie działa (taśma, długości, pokrycie kamer, długości kabli).
- **Zapis**: tekst zamiast samej kropki („Zapisano 14:02”, „Zapisywanie…”, „Offline – zmiany czekają”). Przy błędzie czerwony stan z akcją *Ponów*.
- Przyciąganie i auto-numeracja przenoszą się tu z górnego paska. To ustawienia, a nie narzędzia (*Inw. §3 #20–21*).

### 2.2 Tryb aktywnego narzędzia musi być oczywisty (P2, S)
- Nazwa i ikona narzędzia jako „pigułka” w pasku kontekstowym (dziś to mały szary napis), z **✕ Zakończ (Esc)**.
- Kursor zależny od narzędzia jest dziś tylko dla części z nich: dodać go dla każdego.
- **ToolHint** pokazywać przez kilka sekund po włączeniu narzędzia, potem zwijać do ikonki „?”. Dziś wisi stale i zasłania plan.

### 2.3 Zależności widoczne z góry, a nie dopiero w toaście (P1, S)
Dziś: klikasz taśmę → toast „Set the scale first” → przełączenie na sondę. Klikasz pokrycie kamer →
toast. Grupa CCTV znika, dopóki nie ma kamery (*Inw. §12.10*).

**Propozycja:**
- Narzędzia **zawsze widoczne**; jeśli brakuje warunku, są wyszarzone, a podpowiedź mówi, czego brakuje i jak to naprawić („Wymaga skali: *Ustaw skalę*”).
- Grupa CCTV zawsze dostępna (albo w przestrzeni roboczej *CCTV*, patrz §3.2).
- Bez IDF: wyszarzone *By IDF* i *Cable route* z podpowiedzią „Dodaj rack/IDF z *Objects → Low Voltage*”.

### 2.4 Lista kontrolna projektu (P2, M)
Nowy projekt ma kroki, bez których połowa funkcji nie działa. Po otwarciu nowego projektu albo pod
przyciskiem w pasku stanu warto pokazać zwijaną listę:

```
Konfiguracja projektu                       3/5
✓ Rysunek PDF
✓ Skala             (1" = 8')
○ IDF / rack        → Dodaj
○ Warstwy           → Utwórz warstwy (Data, AV, CCTV…)
✓ Uprawnienia techników
```

Znika, gdy wszystko jest gotowe. To prosty sposób na odkrywanie funkcji bez samouczka.

---

## 3. Architektura paska narzędzi

### 3.1 Co jest narzędziem, co ustawieniem, a co poleceniem (P1, S)
Dziś przełączniki, narzędzia i polecenia stoją obok siebie w jednym rzędzie (*Inw. §3*).
Rekomendowany podział, zgodny z tym, jak ludzie budują model mentalny:

| Rodzaj | Zachowanie | Gdzie | Przykłady |
|---|---|---|---|
| **Narzędzie** (tryb) | aktywne do odwołania, zmienia znaczenie kliknięcia | pasek narzędzi, jedno podświetlone | Select, Draw, Fill, Measure, Route, Jumper, Wall, Area, Stamp |
| **Polecenie** | wykonuje się raz | menu, pasek kontekstowy, skrót | Add text, Add image, Duplicate, Delete, Export |
| **Ustawienie / widok** | przełącznik stanu | pasek stanu, menu *Widok* | Snap, Auto-numbering, Show routes, Show jumpers, Coverage, Color by status, Mount heights, Touch layout |

Dziś „Add Text” i „Add Image” stoją między narzędziami, choć są poleceniami. *Objects* wygląda jak
narzędzie, ale jest paletą. Warstwy widoku (trasy, zworki, pokrycie) są rozrzucone po grupach.

**Propozycja:**
- Pasek narzędzi zawiera tylko narzędzia (tryby), pogrupowane: *Wybór · Rysowanie · Pomiar · Kable · CCTV*.
- Nowa pozycja **Widok** (menu albo osobny przycisk z oczkiem) zbiera wszystkie przełączniki widoczności: trasy, zworki z filtrem typów, pokrycie, kolory statusów, wysokości montażu, nakładkę.
- *Add text / image* trafiają do palety *Wstaw*, razem z dzisiejszym *Objects*.

### 3.2 Przestrzenie robocze (P2, L)
Pasek ma dziś ok. 24 elementy i przewija się w bok na iPadzie. Praca PM ma wyraźne fazy, więc
**zakładki przestrzeni roboczych** pokazują tylko narzędzia danej fazy:

| Przestrzeń | Narzędzia | Domyślny widok |
|---|---|---|
| **Plan** | Select, Wstaw (urządzenia, kształty, tekst, obraz), Draw, Fill, Measure, Stamp | bez tras i pokrycia |
| **Kable** | Select, Route, Jumper, IDF, podsumowanie kabli | trasy i zworki włączone |
| **CCTV** | Select, kamery, Wall, Blindspot, Area, Auto-place | pokrycie włączone |
| **Postęp** | Select, statusy, prośby techników, komentarze | kolory statusów włączone |

Zakładki przełączają też domyślne widoki, co rozwiązuje dzisiejsze ręczne włączanie warstw widoku.
Narzędzia z innych przestrzeni dalej działają ze skrótów, więc nic nie ginie dla zaawansowanych.

### 3.3 Konkretne poprawki w obecnym pasku (jeśli przestrzenie robocze później)
| Co | Zmiana | Prio |
|---|---|---|
| Popover ⚙ przy Draw i Fill | usunąć: te same opcje są w pasku kontekstowym po wybraniu narzędzia (*Inw. §12.5*) | P2, S |
| Split button *Measure* (tape / path) | dwa osobne narzędzia: przycisk zmieniający ikonę zależnie od ostatniego wyboru utrudnia rozpoznanie | P2, S |
| *Probe scale* ukryte w pasku kontekstowym | sonda dostępna z paska stanu (skala) i z menu pomiaru | P2, S |
| *Objects* podświetlony tylko przy otwartym menu | wygląd zwykłego przycisku palety (nie przełącznika) | P3, S |
| *Requests* | zostaje po prawej, ale z liczbą jako odznaką (●3) zamiast zmiany koloru całego przycisku | P3, S |
| Undo / Redo / History | zostają przy zoomie, ale *History* jako pozycja menu *Edycja* | P3, S |

---

## 4. Pasek kontekstowy i panel właściwości

Dziś edycja zaznaczonego obiektu jest w dwóch miejscach naraz: w pasku kontekstowym (etykieta, kolor,
warstwa, usuń) i w panelu właściwości (wszystko). Te same pola są w dwóch miejscach, a różne funkcje
w różnych miejscach (*Inw. §4, §6.2*).

### 4.1 Jasny podział (P1, M)
- **Pasek kontekstowy** = szybkie akcje na zaznaczeniu, czyli to, co robi się dziesiątki razy: *Etykieta (z numeracją)*, *Status*, *Warstwa*, *Duplikuj*, *Obróć*, *Rozmiar ±*, *Usuń*. Status dziś w nim nie występuje, choć jest jedną z najczęstszych akcji.
- **Panel właściwości** = pełne dane obiektu w sekcjach: *Identyfikacja*, *Status i postęp*, *Kable i IDF*, *Zworki*, *CCTV*, *Położenie*, *Wygląd*, *Zdjęcia*, *Komentarze*.

### 4.2 Panel właściwości (P2, M)
- **Sekcje zwijane** z zapamiętanym stanem; nagłówek z liczbą/podsumowaniem („Kable: 2× Cat6”, „Zdjęcia (3)”). Dziś panel to długa kolumna, w której zdjęcia i komentarze są na samym dole.
- **Kolejność według częstości dla roli**: dla technika najpierw *Status → Zdjęcia → Komentarze → Prośba*, dla PM *Identyfikacja → Kable → Status*.
- **Jeden przycisk Usuń** (w nagłówku, z ikoną kosza), bez drugiego na dole (*Inw. §12.7*).
- **Pola tylko do odczytu** dla technika jako tekst, a nie wyszarzone pola formularza. Tam, gdzie może prosić o zmianę: przycisk *Poproś o zmianę*.
- **Zbiorcza edycja**: nagłówek „5 obiektów” + przy polach z różnymi wartościami etykieta „Różne” (dziś puste pole, które wygląda jak brak wartości).
- **Status** jako pigułki w kolorach statusów, takie same jak w legendzie i na planie (rozpoznawalność między miejscami).

### 4.3 Etykieta i numeracja: jeden system (P1, M)
Dziś są dwa niezależne mechanizmy (*Inw. §12.3–4*): *Auto-numbering* (prefix + licznik, ukryty tryb
stempla) i wzorce `%1` (pole Label, *Chain*, *By IDF*).

**Propozycja jednego modelu „Numeracja”:**
- Jeden wzorzec projektu, np. `CAM-%01`, z bieżącym licznikiem w pasku stanu (`# CAM-%01 → 14`).
- **Stawianie** (dzisiejszy stempel) jako jawne narzędzie *Stamp* z wybranym urządzeniem i wzorcem, widoczne w pasku narzędzi.
- **Numerowanie zaznaczonych**: pole *Etykieta* + rozwijana lista *Kolejność*: *Kolejność zaznaczenia* / *Najbliższy sąsiad (wierszami)* / *Odległość do IDF*, z podglądem `CAM-01 … CAM-14` i przyciskiem **Numeruj**. Trzy przyciski obok pola zastępuje jedna decyzja.
- *Duplikuj* bierze kolejny numer z tego samego wzorca.
- Pomoc do wzorca (`%1`, `%01`, `%10`) jako mała ikonka „?” przy polu zamiast długiego tytułu w tooltipie.

---

## 5. Panel warstw

| Zmiana | Uzasadnienie | Prio |
|---|---|---|
| Dodać **🔒 blokadę**, **przeciąganie warstw** (kolejność), **krycie** (suwak w menu warstwy) | funkcje są w modelu i dokumentacji, brakuje tylko UI (*Inw. §12.1*); krycie trzeba też zacząć rysować | P1, M |
| **Menu „⋯” przy warstwie**: zmień nazwę, krycie, zablokuj, usuń, zaznacz wszystkie obiekty | ukrycie rzadkich akcji, mniej przypadkowych kliknięć w kosz | P2, S |
| Usunięcie warstwy z obiektami: komunikat „Usunięto warstwę X (14 obiektów) · *Cofnij*” | dziś znika bez ostrzeżenia | P1, S |
| **Wyraźne oznaczenie aktywnej warstwy** (pasek z lewej + „aktywna”) i zgodność z paskiem stanu | dziś to tylko lekkie tło | P2, S |
| **Wyszukiwanie / filtr** listy obiektów (nazwa, typ, status) | przy setkach obiektów lista jest bezużyteczna bez filtra | P2, M |
| Obiekty z problemem (Issue, oczekująca prośba, brak kabli) oznaczone ikonką na liście | szybkie znalezienie pracy do wykonania | P2, S |
| Kolejność listy obiektów zgodna z kolejnością warstw (**góra listy = na wierzchu**) | dziś warstwy są od góry, a obiekty od dołu: dwie odwrotne konwencje | P3, S |
| Przeciąganie obiektów **także dotykiem** (uchwyt ⋮⋮ przy wierszu) | HTML5 drag & drop nie działa na tabletach | P3, M |

---

## 6. Interakcje na planie

### 6.1 Klawiatura (P2, S)
- **Skróty narzędzi działają zawsze.** Wpisywanie etykiety zacznie się od `Enter` albo `F2` (konwencja z arkuszy i eksploratorów plików), a nie od dowolnej litery (*Inw. §12.11*).
- **`?` pokazuje ściągawkę skrótów**, a podpowiedzi przy przyciskach zawsze podają skrót.
- Dodać skróty dla brakujących narzędzi: *Path measure*, *Area*, *Stamp*, *Text* (np. `T`).
- **Jedno znaczenie `Esc`**: „anuluj bieżącą czynność, a drugi raz wyjdź z narzędzia” (*Inw. §12.16*). Tak działają edytory graficzne, więc nie trzeba się tego uczyć.

### 6.2 Mysz (P3, S)
- Brak uchwytów zmiany rozmiaru jest świadomą decyzją (przeciąganie zawsze przesuwa). Warto to pokazać: przy zaznaczeniu mała etykieta „± rozmiar” albo uchwyt tylko z **Alt** albo w rogu z większym progiem.
- **Menu kontekstowe pod prawym przyciskiem** z akcjami zaznaczenia (duplikuj, obróć, warstwa, status, usuń). Dziś prawy klik nic nie robi, a to najszybsza droga dla PM.

### 6.3 Dotyk (tablet) (P2, S)
- Pasek akcji nad obiektem: dodać **Status** (najczęstsza akcja w terenie) i **Przesuń**. *Props* nazwać *Więcej*.
- Podwójne stuknięcie = duplikat jest nieodkrywalne i łatwo je zrobić przypadkiem. Lepiej zostawić to przyciskowi *Copy* na pasku akcji, a podwójnym stuknięciem przybliżać (konwencja map i przeglądarek zdjęć).
- Przyciski minimum **44×44 pt** (wytyczne Apple / Material). Dziś część przycisków w trybie dotykowym ma 40 px.

---

## 7. Telefon: zbudowany pod technika

Dziś telefon to okrojony edytor (*Inw. §10*). Dla technika potrzebne są inne punkty wejścia:

| Zmiana | Uzasadnienie | Prio |
|---|---|---|
| **Wyszukiwanie obiektu** (nazwa / numer) z przybliżeniem do niego | „gdzie jest CAM-14” to pierwsze pytanie w terenie; dziś trzeba szukać na planie | P1, M |
| **Lista „Moje zadania”**: obiekty wg statusu (do zaciągnięcia, do zakończenia, z problemem) + prośby | praca wg listy zamiast wg mapy | P2, M |
| Dolny pasek: **status jako duża siatka 2×3** zamiast przewijanego rzędu | prawo Fittsa, jedna ręka; przewijanie w bok ukrywa statusy | P2, S |
| **Zdjęcie jednym stuknięciem** jako główny przycisk (FAB), gdy coś jest zaznaczone | najczęstsza akcja obok statusu | P2, S |
| **Cofnij** w toaście po każdej zmianie (status, przesunięcie, usunięcie) | dziś telefon w ogóle nie ma cofania (*Inw. §12.7*) | P1, M |
| **Stan offline** w nagłówku + kolejka zmian | w budynkach brak zasięgu to norma | P2, L |
| Szczegóły obiektu dostępne **dla każdej roli** (admin dziś ich nie ma; technik: wersja do odczytu z prośbami) | *Inw. §12.9* | P1, S |
| Ikony w nagłówku (PDF, ZIP) **z podpisami albo w menu** | ikona pudełka (ZIP) i pobierania są niejednoznaczne | P3, S |

---

## 8. Akcje nieodwracalne i błędy

| Zmiana | Uzasadnienie | Prio |
|---|---|---|
| Okienka `window.confirm` zastąpić: dla odwracalnych akcji **toast z Cofnij**; dla nieodwracalnych (usunięcie projektu, ikony z biblioteki zespołu, skali) własny dialog z nazwą obiektu i skutkami | potwierdzenia są odruchowo klikane; przeglądarkowe okienka wyglądają obco i blokują stronę | P1, M |
| Usunięcie projektu: wpisanie nazwy projektu | akcja nieodwracalna, dotyka całego zespołu | P2, S |
| Nie pokazywać akcji, których rola nie może wykonać (Rename / Share / Delete dla projektów udostępnionych) albo wyszarzyć z wyjaśnieniem „Tylko właściciel” | zapobieganie błędom (*Inw. §12.8*) | P1, S |
| Błędy serwera: zrozumiały tekst + co zrobić („Ktoś inny zmienił plan, scaliliśmy zmiany”) | dziś część błędów to surowe komunikaty | P2, S |
| Wypełnienie > 50% strony: zamiast pytania pokazać podgląd i *Zastosuj / Anuluj* | użytkownik widzi skutek zamiast zgadywać | P3, M |

---

## 9. Nazewnictwo, język i oznaczenia

| Zmiana | Prio |
|---|---|
| Jeden język UI: „Zarządzaj użytkownikami” → *Manage users* (albo pełne tłumaczenie całości, ale nie mieszanka) (*Inw. §12.13*) | P1, S |
| Słownik pojęć, jednakowy wszędzie: *Duplicate* vs *Copy* (oba znaczą duplikat z numerem, a *Ctrl+C* to kopiowanie do schowka); *Props* vs *Properties*; *Rack* vs *IDF* | P2, S |
| Nazwy z perspektywy zadania, nie mechanizmu: *Overlay blueprint* → *Porównaj z innym rysunkiem*; *Probe scale* → *Ustaw skalę*; *Plan change* → *Zmiana w rewizji* | P2, S |
| **Legenda statusów i typów zworek** dostępna z planu (mała ikonka w rogu) | P2, S |
| Ikony wieloznaczne opisane tekstem w trybie dotykowym (magnes, #, oko, kabel ▾) | P3, S |
| Etykiety pól zamiast placeholderów (np. *Switch ID* jako etykieta, przykład „SW-01” jako podpowiedź pod polem) | P3, S |

---

## 10. Spójność wizualna

| Zmiana | Prio |
|---|---|
| **Trzy wyglądy przycisków o stałym znaczeniu**: narzędzie aktywne = pełny kolor; ustawienie włączone = jasny odcień (dziś wariant `switch`); polecenie = zwykły przycisk. Wyjątki usunąć (*Inw. §12.15*) | P2, S |
| Kolory statusów **zarezerwowane dla statusów** (nie używać zieleni/czerwieni do innych znaczeń, np. kropki zapisu: tekst + neutralny kolor) | P2, S |
| Kolory IDF i typów zworek sprawdzone pod kątem daltonizmu; drugi wyróżnik (wzór linii, litera) | P3, M |
| Jednolity rozmiar ikon i odstępów w pasku (dziś 8/7/6 px wysokości różnych elementów) | P3, S |

---

## 11. Dostępność

- Kontrast tekstów pomocniczych (`text-[10px] text-muted-foreground`) poniżej WCAG AA w wielu miejscach: minimum 12 px i kontrast 4.5:1.
- Wszystkie przyciski-ikony z `aria-label` (część ma tylko `title`).
- Obsługa klawiatury w panelach i listach (fokus widoczny, kolejność tab).
- Status nie tylko kolorem: kształt albo litera w kropce statusu.

---

## 12. Proponowana kolejność wdrożenia

| Faza | Zakres | Efekt |
|---|---|---|
| **1. Szybkie poprawki** (≈ 1 tydzień) | pasek stanu (§2.1), narzędzia zawsze widoczne z powodem (§2.3), uprawnienia w UI (§8, §7 admin), język (§9), usunięcie duplikatów ⚙ (§3.3), skróty zawsze + `?` (§6.1) | mniej błędów i zagubienia bez zmiany układu |
| **2. Odwracalność i warstwy** (≈ 1–2 tygodnie) | toast z Cofnij zamiast confirm, cofanie na telefonie (§8), pełny panel warstw (§5) | bezpieczna praca, brakujące funkcje |
| **3. Numeracja i właściwości** (≈ 2 tygodnie) | jeden system numeracji (§4.3), podział pasek kontekstowy / panel, sekcje zwijane (§4.1–4.2) | szybsza praca PM |
| **4. Telefon dla technika** (≈ 2–3 tygodnie) | wyszukiwanie, lista zadań, duże statusy, offline (§7) | realna poprawa pracy w terenie |
| **5. Przestrzenie robocze** (≈ 3 tygodnie) | zakładki Plan / Kable / CCTV / Postęp, menu Widok (§3.1–3.2), lista kontrolna projektu (§2.4) | prostszy interfejs przy rosnącej liczbie funkcji |

Każdą fazę warto zamknąć krótkim testem z 3–5 użytkownikami (osobno PM i technik) na realnym planie.
Mierzyć: czas typowych zadań (postawić i ponumerować 20 urządzeń, zmienić status 10 obiektów w terenie,
znaleźć konkretny obiekt) i liczbę pomyłek.
