# Conversation Log — TASK-452459

**Task:** wyrzuc z wersji telefonicznej add objects, pozostaw jedynie maly bar na dole gdzie moge dodaj zdjecie do zaznaczonego wczeniusje obiektu - jesli jestem PM, a jesli TECH moge tylko zaznaczac checkbox color by status - zadnych plusow czy wysuwania menu do gory - tylko podglad jako TECH

**Roles:** architect=Gemini, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-04 19:42:44

### Gemini (Architekt)

**Summary:** Restructure the mobile UI to replace the object creation panel with role-specific minimal bars: PMs get photo upload for selected objects, while Technicians get only a status-color toggle in a preview-only mode.

**Plan:**
1. **Research Role and Mobile Component Usage** — Examine `client/src/pages/home.tsx`, `client/src/components/editor/MobileBottomBar.tsx`, and `client/src/components/editor/MobileAddObjectPanel.tsx` to identify how roles are accessed and where the 'Add Object' UI is triggered. `[MODIFY]`
2. **Remove Mobile Object Creation UI** — Hide or remove the `MobileAddObjectPanel` and its associated 'plus' buttons from the mobile view in `home.tsx` and `Toolbar.tsx`. `[MODIFY]`
3. **Implement Role-Based Mobile Bottom Bar** — Refactor `MobileBottomBar.tsx` to: 1. If user is PM, show only a photo upload button (enabled when an object is selected). 2. If user is TECH, show only the 'Color by status' checkbox/toggle. Remove all sliding menu logic. `[MODIFY]`
4. **Enforce Technician Preview Mode** — Ensure that on mobile, users with the Technician role cannot move, resize, or delete objects, effectively making it a preview-only mode as requested. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` Mobile view does not contain any '+' buttons or 'Add Object' menus.  
  *Verify:* Visual inspection of `client/src/pages/home.tsx` and `client/src/components/editor/Toolbar.tsx` for conditional rendering based on `isMobile`.
- `[c2]` For PM role on mobile, `MobileBottomBar` renders a button to add photos to a selected object.  
  *Verify:* Check `MobileBottomBar.tsx` for `role === 'admin'` or `'manager'` logic rendering `ObjectPhotoGallery` or a direct upload trigger.
- `[c3]` For TECH role on mobile, `MobileBottomBar` renders only a checkbox/switch for 'Color by status'.  
  *Verify:* Check `MobileBottomBar.tsx` for `role === 'technician'` logic rendering the `Checkbox` for status colors.
- `[c4]` Mobile Bottom Bar does not expand/slide upwards.  
  *Verify:* Verify `MobileBottomBar.tsx` does not use `Drawer` or height-expanding animations/states.
- `[c5]` Technicians cannot drag or resize objects on mobile.  
  *Verify:* Check `ObjectRenderer.tsx` for `disableDragging` and `enableResizing={false}` props on the `Rnd` component when user is a technician and on mobile.

**Risks:**
- Frontend role detection may rely on `useCurrentUser()` which might return null if the session is strictly technician-name based (trust-based).
- Removing the 'Add' functionality on mobile might block PMs who occasionally need to fix/add things on site if they aren't near a desktop.
- The 'Color by status' toggle might require a global state change that needs to be properly synced with the UIContext.

---

