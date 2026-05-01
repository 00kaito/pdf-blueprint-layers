# Conversation Log — TASK-20B63E

**Task:** w trybie na telefon umozliw tylko zmiane label oraz dodawanie zdjec do obiektow (bez mozliwosci dodawania i usuwania obiektow)

**Roles:** architect=Claude, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-01 14:38:01

### Claude (Architekt)

**Summary:** Ograniczyć tryb mobilny wyłącznie do edycji etykiety (name) i dodawania zdjęć do obiektów. Usunąć z MobileBottomBar sekcję 'Add Object' w trybie listy oraz przycisk 'Delete Object' w trybie edycji.

**Plan:**
1. **Usuń sekcję dodawania obiektów i przycisk usuwania z MobileBottomBar** — W pliku MobileBottomBar.tsx:
1. Usuń cały blok 'Add Object' (div z h3 'Add Object', rząd przycisków ikon/tekstu oraz Separator po nim) z trybu 'list'.
2. Usuń przycisk 'Delete Object' (Button variant='destructive' z DELETE_OBJECTS dispatch i Separator przed nim) z trybu 'edit'.
3. Usuń nieużywane importy ikon: Circle, Square, Triangle, Hexagon, Camera, ArrowRight, Trash2.
4. Usuń import useObjectCreation oraz destrukturyzację handleAddIcon, handleAddText (linia 27). `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` W MobileBottomBar.tsx nie ma importu useObjectCreation ani żadnego wywołania handleAddIcon lub handleAddText  
  *Verify:* Grep po 'useObjectCreation', 'handleAddIcon', 'handleAddText' w MobileBottomBar.tsx zwraca 0 wyników
- `[c2]` W MobileBottomBar.tsx nie ma sekcji JSX z nagłówkiem 'Add Object' ani przyciskami tworzącymi obiekty (circle, camera, square, triangle, hexagon, arrow-right, text)  
  *Verify:* Grep po 'Add Object' oraz 'handleAddIcon' w MobileBottomBar.tsx zwraca 0 wyników
- `[c3]` W MobileBottomBar.tsx nie ma przycisku usuwającego obiekt (variant='destructive' z DELETE_OBJECTS dispatch)  
  *Verify:* Grep po 'DELETE_OBJECTS' w MobileBottomBar.tsx zwraca 0 wyników
- `[c4]` W trybie 'edit' MobileBottomBar nadal renderuje Input do edycji name oraz komponent ObjectPhotoGallery  
  *Verify:* W MobileBottomBar.tsx istnieje blok JSX z tagiem Input (onChange z UPDATE_OBJECTS) oraz ObjectPhotoGallery w gałęzi mode === 'edit'
- `[c5]` W trybie 'list' MobileBottomBar nadal renderuje listę obiektów (Layer Objects) umożliwiającą ich zaznaczenie  
  *Verify:* W MobileBottomBar.tsx istnieje blok JSX z 'Layer Objects' oraz docState.objects.map z onClick SELECT_OBJECT
- `[c6]` Nieużywane importy ikon (Circle, Square, Triangle, Hexagon, Camera, ArrowRight, Trash2) zostały usunięte z MobileBottomBar.tsx  
  *Verify:* Grep po 'import.*Circle\|import.*Trash2\|import.*Camera' w MobileBottomBar.tsx zwraca 0 wyników dla tych symboli

**Risks:**
- Jeśli w przyszłości zostaną dodane nowe przyciski akcji do MobileBottomBar, trzeba pamiętać o tym ograniczeniu i nie wprowadzać ich bez celowego decyzji projektowej
- Użytkownicy mobilni nie będą mogli dodawać ani usuwać obiektów — jeśli wymagane jest awaryjne obejście, trzeba by dodać oddzielny tryb uprawnień lub flagę

---

