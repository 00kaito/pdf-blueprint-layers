# Conversation Log — TASK-7DADFC

**Task:** w wersji na telefon dla roli TECh usun sidebars i wszelka mozliwosc edycji/dodawania czegokolwiek - brak sidbars, tylko podglad z opcja kolorowania po statusie, a dla PM daj dodatkowo mozliwosc edycji LABEl, dodawania komentarzy do obiektow/ikon, oraz dodawanie dla nich galerii/zdjec

**Roles:** architect=Gemini, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-04 18:33:51

### Gemini (Architekt)

**Summary:** Implement role-based restrictions and capabilities for mobile users, specifically limiting TECH role to view-only status coloring while granting PM role enhanced object editing, commenting, and gallery management.

**Plan:**
1. **Update Schema and Types for Comments** — Add 'comments' field to EditorObject interface in client/src/lib/types.ts and ensure shared/schema.ts supports storing these within the project state JSON. `[MODIFY]`
2. **Role-Based UI Filtering in Home Page** — Modify home.tsx to detect 'isMobile' and 'user.role'. If role is TECH and isMobile is true, hide Sidebars (LayerPanel, PropertiesPanel) and the AddObjectPanel. `[MODIFY]`
3. **Disable Canvas Interactions for Mobile TECH** — Update Canvas.tsx and ObjectRenderer.tsx to disable dragging, resizing, and drawing tools when the user is a TECH on a mobile device. `[MODIFY]`
4. **Enable Status Coloring for TECH on Mobile** — Ensure the 'Color by Status' toggle is available in the MobileBottomBar or a simplified mobile menu for TECH users. `[MODIFY]`
5. **Enhance Mobile PM Object Editing** — Modify PropertiesPanel.tsx (or create a MobilePropertiesDialog) to allow PMs to edit labels, add/view comments, and manage the ObjectPhotoGallery on mobile. `[MODIFY]`
6. **Implement Mobile Comment System** — Create or update a component to allow PMs to input and display comments for a selected object on mobile. `[CREATE]`

**Acceptance Criteria:**
- `[c1]` On mobile devices, users with role 'TECH' cannot see or open LayerPanel or PropertiesPanel sidebars.  
  *Verify:* Check conditional rendering in client/src/pages/home.tsx for TECH role + isMobile.
- `[c2]` Object dragging and resizing (react-rnd) is disabled for TECH role on mobile.  
  *Verify:* Verify 'disableDragging' and 'enableResizing={false}' props in ObjectRenderer.tsx when role is TECH and isMobile is true.
- `[c3]` The 'Color by Status' feature is accessible to TECH users on mobile via the UI.  
  *Verify:* Confirm MobileBottomBar.tsx contains a toggle or button for status coloring visible to TECH role.
- `[c4]` PM users on mobile can edit the 'name' (label) field of a selected object.  
  *Verify:* Check for an enabled Input or Textarea for 'name' in the mobile properties view for PM role.
- `[c5]` PM users on mobile can view and add photos via the ObjectPhotoGallery component.  
  *Verify:* Verify ObjectPhotoGallery.tsx is rendered and functional for PM role on mobile.
- `[c6]` The EditorObject type in types.ts includes an optional 'comments' string or string array.  
  *Verify:* Inspect client/src/lib/types.ts for the presence of 'comments' field in EditorObject interface.
- `[c7]` Drawing mode is forced to 'select' and tool selection is disabled for TECH role on mobile.  
  *Verify:* Check dispatch logic or tool filtering in Toolbar.tsx/MobileBottomBar.tsx for TECH role on mobile.

**Risks:**
- Race conditions if role state isn't immediately available on page load.
- Mobile detection (use-mobile.tsx) might not catch all tablet devices correctly without viewport adjustments.
- Hardcoded role strings ('TECH', 'PM') might diverge from database values if not centralized in schema.ts.

---

