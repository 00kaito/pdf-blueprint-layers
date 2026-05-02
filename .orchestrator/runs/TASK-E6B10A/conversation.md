# Conversation Log — TASK-E6B10A

**Task:** w wersji na telefon - male ekrany - daj mozliwosc tylko przegladania planu (bez widocznego lewego sidebara),zaznaczanie obiektow i ich przesuwanie,  dodawanieobiektow do odpowiedniej warstwy, zmiane nazw/labels, dodawania zdjec - Na malych ekranach jest malo miejsca, wiec ogranicz wielkosc tego interfejsu - najwazniejsza jest mozliwosc przegladania planu w trybie zwyklm i color by status (tak ten checkbox tez powinien byc dostepny)

**Roles:** architect=Claude, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-02 16:46:53

### Claude (Architekt)

**Summary:** Redesign the mobile UI by replacing the fixed 50vh MobileBottomBar with a compact always-visible 48px strip (containing the color-by-status toggle and a '+' FAB), plus contextual bottom sheets for object editing and object creation. The canvas remains the dominant element; all editing surfaces slide in on demand.

**Plan:**
1. **Create MobileAddObjectPanel component** — Create a new component that renders the content for the 'add object' bottom sheet. It must show: (a) a <Select> to pick the active layer from docState.layers, which dispatches SET_ACTIVE_LAYER on change; (b) a grid of icon type buttons (camera, square, circle, triangle, star, hexagon, arrow-right) that call useObjectCreation.handleAddIcon(type) and close the sheet; (c) a 'Text' button calling handleAddText(); (d) an 'Image' file-input button calling handleImageUpload(). Use compact 44×44px touch targets arranged in a 4-column icon grid. The component accepts an onClose: () => void prop. `[CREATE]`
2. **Rewrite MobileBottomBar as compact strip + contextual sheets** — Remove the fixed h-[50vh] modal pattern. Replace with: (1) An always-visible bottom strip div, fixed bottom-0, h-12 (48px), containing three zones: LEFT — a Checkbox wired to uiState.showStatusColors / dispatch({type:'TOGGLE_STATUS_COLORS'}) with a small label 'By status'; CENTER — when no object selected: active layer name (truncated, tappable to open add sheet); when object selected: an inline Input for selectedObject.name with immediate UPDATE_OBJECTS dispatch (debounced 300ms); RIGHT — when no object selected: a '+' circular Button that opens the add-object Sheet; when object selected: a Camera icon Button that opens the edit Sheet at the photos section, plus a ChevronUp Button to expand full properties. (2) A shadcn Sheet (side='bottom') for 'add object' mode: renders MobileAddObjectPanel, max-h-[38vh], with drag handle. (3) A shadcn Sheet (side='bottom') for 'edit/details' mode: renders the three sections stacked — name input (always), compact 2×3 status grid (6 status buttons), ObjectPhotoGallery, and a 'Full Properties' button that scrolls within the sheet to reveal PropertiesPanel; max-h-[55vh] with ScrollArea inside. Remove the old mode state machine (list/edit/details) — replace with two boolean sheet-open states: addSheetOpen and editSheetOpen. Keep the hidden-bar FAB for when user hides the strip. `[MODIFY]`
3. **Add bottom padding to canvas on mobile** — In home.tsx, in the mobile layout branch (isMobile === true), add className 'pb-12' to the div wrapping Canvas so the 48px strip does not obscure the bottom of the canvas. The Canvas component's inner scroll container already handles overflow, so only the outer wrapper needs this padding. `[MODIFY]`
4. **Wire layer selection in add panel to UIContext** — In MobileAddObjectPanel, when the user picks a layer from the Select, dispatch SET_ACTIVE_LAYER to uiDispatch (from useUI()). Verify that the SET_ACTIVE_LAYER action already exists in UIContext (it does — confirmed in editor-context.tsx). After dispatching, call the relevant useObjectCreation function. This ensures objects are always added to the correct layer chosen by the user on mobile. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` MobileBottomBar renders a fixed bottom strip of exactly h-12 (48px) containing a Checkbox element wired to uiState.showStatusColors; toggling it dispatches TOGGLE_STATUS_COLORS  
  *Verify:* Read MobileBottomBar.tsx and confirm: (1) outer div has className including 'h-12' and 'fixed bottom-0'; (2) Checkbox onCheckedChange calls uiDispatch({type:'TOGGLE_STATUS_COLORS'}); (3) checked prop equals uiState.showStatusColors
- `[c2]` The fixed 50vh constant is removed from MobileBottomBar.tsx — no h-[50vh] class remains  
  *Verify:* Grep MobileBottomBar.tsx for 'h-\[50vh\]' — must return zero matches
- `[c3]` MobileAddObjectPanel.tsx exists and exports a React component accepting an onClose prop; it contains a Select element listing docState.layers and at minimum 7 icon type buttons (camera, square, circle, triangle, star, hexagon, arrow-right)  
  *Verify:* File client/src/components/editor/MobileAddObjectPanel.tsx exists; grep for 'onClose' prop, 'camera', 'square', 'circle', 'triangle', 'star', 'hexagon', 'arrow-right'
- `[c4]` When an object is selected (uiState.selectedObjectIds.length > 0), MobileBottomBar renders an Input whose value is selectedObject.name and whose onChange dispatches UPDATE_OBJECTS  
  *Verify:* Read MobileBottomBar.tsx and confirm the conditional block for selectedObjectId renders an Input with value bound to selectedObject.name and onChange dispatching UPDATE_OBJECTS
- `[c5]` MobileBottomBar uses two Sheet components (not a mode state machine with 'list'/'edit'/'details' string literals)  
  *Verify:* Grep MobileBottomBar.tsx for string literals 'list', 'edit', 'details' used as mode values — must return zero matches; grep for '<Sheet' — must return at least two matches
- `[c6]` The edit Sheet contains an ObjectPhotoGallery component, enabling photo addition on mobile  
  *Verify:* Read MobileBottomBar.tsx and confirm ObjectPhotoGallery is imported and rendered inside one of the Sheet components
- `[c7]` home.tsx mobile layout wrapper div has className including 'pb-12' when isMobile is true  
  *Verify:* Read home.tsx, find the isMobile branch for canvas layout, confirm 'pb-12' is present on the wrapper
- `[c8]` MobileAddObjectPanel dispatches SET_ACTIVE_LAYER when layer is changed in the Select, before adding any object  
  *Verify:* Read MobileAddObjectPanel.tsx and confirm Select onValueChange calls uiDispatch({type:'SET_ACTIVE_LAYER', payload: layerId}) before or alongside the object creation call

**Risks:**
- The shadcn Sheet component used as a bottom drawer may conflict with react-rnd drag events on objects near the bottom of the canvas — test that dragging an object close to the strip does not accidentally open a sheet
- The inline name Input in the 48px strip is very narrow on small screens (320px wide phones); truncation or a minimal width constraint may cut off editing — consider opening to a larger sheet input instead
- ObjectPhotoGallery likely uses a file input that triggers the native camera/gallery picker on iOS/Android; ensure the Sheet does not dismiss when the picker opens (some browsers fire a blur/focus sequence that closes Radix sheets)
- The add-object panel calls useObjectCreation hooks; those hooks use window.innerWidth for getCenterPosition — on mobile this works correctly only if the Sheet is not covering the canvas when the position is calculated

---

