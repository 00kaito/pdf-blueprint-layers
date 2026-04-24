# Dokumentacja: Lokalizacja Obiektów i Eksport Dokumentów PDF

Niniejsza instrukcja wyjaśnia zasady pozycjonowania obiektów (warstw, adnotacji, kształtów) wewnątrz dokumentu PDF oraz sposób, w jaki system zarządza ich renderowaniem i eksportem.

## 1. Układ Współrzędnych PDF (Coordinate System)

Kluczową różnicą między środowiskiem Web (HTML/Canvas) a formatem PDF jest punkt początkowy układu współrzędnych.

*   **Web/Canvas:** Punkt `(0,0)` znajduje się w **lewym górnym rogu**. Wartości Y rosną w dół.
*   **PDF (Standard ISO 32000):** Punkt `(0,0)` znajduje się domyślnie w **lewym dolnym rogu** (tzw. *MediaBox*). Wartości Y rosną w górę.

### Jednostki: Typograficzny Punkt (Point)
PDF operuje na jednostkach "points" (pt).
*   `1 point = 1/72 cala`.
*   Standardowa strona A4 ma wymiary `595 x 842 pt`.

### Transformacja podczas edycji
Deweloper musi implementować mapowanie współrzędnych:
`pdf_y = page_height - web_y - object_height`

## 2. Relatywność Pozycji i Skalowanie (Zoom)

### Dlaczego obiekty "zostają w miejscu" przy Zoomie?
Obiekty w naszym edytorze nie są pozycjonowane względem pikseli ekranu, lecz względem **przestrzeni współrzędnych strony PDF**.

1.  **Przestrzeń Modelu (PDF Space):** Obiekt ma stałe współrzędne, np. `x: 100, y: 200`.
2.  **Przestrzeń Widoku (Viewport/Canvas):** Podczas renderowania, współrzędne te są mnożone przez `zoom_factor`.
    *   Jeśli Zoom = 2.0 (200%), obiekt o współrzędnej `100pt` zostanie narysowany na `200px` płótna (canvas).

**Mechanizm zachowania pozycji:**
Przy zoomie zmienia się tylko macierz transformacji (transform matrix) renderera. Relacja `obiekt.x / strona.width` pozostaje stała. Dzięki temu, niezależnie od powiększenia, obiekt zawsze wskazuje ten sam fragment blueprintu (podkładu PDF).

## 3. Zachowanie Obiektów podczas Eksportu (Flattening)

Eksport "splaszczonego" (flattened) pliku to proces przeniesienia obiektów z warstwy UI/Adnotacji bezpośrednio do **Content Streamu** strony PDF.

### Proces pozycjonowania przy eksporcie:
1.  **Normalizacja:** System konwertuje aktualne pozycje obiektów z pikseli edytora z powrotem na punkty (pt) PDF, biorąc pod uwagę oryginalny rozmiar strony (*MediaBox/CropBox*).
2.  **Konwersja Osi:** Następuje odwrócenie osi Y (z webowego top-left na PDF bottom-left).
3.  **Wypalanie (Baking):** Obiekt przestaje być interaktywnym elementem UI, a staje się zestawem instrukcji rysowania wewnątrz pliku PDF (np. operatory `m` dla move, `l` dla line, `re` dla rectangle w składni PDF).

### Wpływ eksportu na dokładność:
*   **Wektorowo:** Jeśli eksportujemy jako obiekty wektorowe (np. za pomocą `pdf-lib`), zachowują one idealną ostrość przy dowolnym powiększeniu w przeglądarkach PDF, ponieważ ich współrzędne są zapisane jako liczby zmiennoprzecinkowe w strukturze pliku.
*   **Rastrowo:** Jeśli strona jest "spłaszczana" do obrazu (np. przy eksporcie do formatu graficznego przed PDF), pozycja jest limitowana przez DPI (standardowo 300 DPI dla druku).

### Rotacja strony (Page Rotation)
Jeśli dokument posiada atrybut `/Rotate`, system współrzędnych wizualnych (to co widzi użytkownik) różni się od wewnętrznego systemu współrzędnych PDF.

**Logika mapowania (Visual -> Physical):**
Zależy od kąta rotacji (zgodnie ze standardem PDF):

*   **0°:** `px = vx`, `py = pH - vy`
*   **90°:** `px = vy`, `py = vx`
*   **180°:** `px = pW - vx`, `py = vy`
*   **270°:** `px = pW - vy`, `py = pH - vx`

Gdzie `vx, vy` to współrzędne wizualne, `pW, pH` to fizyczne wymiary strony (MediaBox), a `px, py` to docelowe punkty w pliku PDF.

**Rotacja obiektu:**
Aby obiekt był wyświetlany prosto na obróconej stronie, musimy zrównoważyć rotację strony:
`total_rotation = page_rotation - visual_object_rotation`
(PDF używa rotacji CCW, a edytor wizualny zazwyczaj CW).

### Zachowanie proporcji (Aspect Ratio)
Obiekty takie jak ikony (koła, gwiazdy) oraz obrazy powinny zachowywać swoje proporcje, nawet jeśli ramka edycji (bounding box) zostanie rozciągnięta.

**Zasada "Object-Contain":**
Podczas eksportu należy obliczyć `minSide = Math.min(width, height)` i użyć tej wartości do rysowania kształtów geometrycznych, centrując je wewnątrz większej ramki. Dla obrazów należy obliczyć współczynnik skali na podstawie ich oryginalnych wymiarów.

## 4. Wskazówki Implementacyjne

*   **Zachowanie proporcji:** Zawsze przechowuj pozycje obiektów jako wartości względne lub w punktach PDF, nigdy w pikselach ekranowych, które zależą od rozdzielczości monitora.
*   **Grupowanie:** Przy przesuwaniu wielu obiektów, ich pozycje `x, y` zmieniają się o ten sam `delta_x` i `delta_y` w przestrzeni punktów PDF, co gwarantuje spójność grupy po eksporcie.
*   **Rotacja strony:** Pamiętaj, że PDF może mieć ustawiony atrybut `/Rotate`. Wtedy system współrzędnych może być obrócony o 90, 180 lub 270 stopni – logika eksportu musi to uwzględniać, aby obiekty nie "wyleciały" poza stronę.
