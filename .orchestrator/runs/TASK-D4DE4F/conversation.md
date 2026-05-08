# Conversation Log — TASK-D4DE4F

**Task:** Kiedy rozwijasz szczegoly obiekty w widoku na telefon zwin pasek szybkiego dostepu (ten pasek gdzie znajduje sie checkbox by status), w pasku szybkiego dostepu tam gdzi jest przycisk PHOTO napisz w nawiasie ile zdjec juz  jest dodanych dla danego obiektu, abym nie musial rozwijac szczegolow. Kiedy wejde w galerie zdjec na telefonie nie moge jej zamknac, moge tylko usunac zdjecie. Daj mozliwosc zamkniecia galerii

**Roles:** architect=Architect, developer=Developer, reviewer=Reviewer

---

## ARCHITECTING — 2026-05-08 10:51:51

### Architect

**Summary:** Implement three mobile UX improvements: (1) collapse quick access bar when object details drawer is open, (2) fix the gallery button to actually open a gallery dialog with close functionality, and (3) add a visible close button to the photo lightbox on mobile.

**Plan:**
1. **Track drawer open state in MobileBottomBar** — Add state to track when the Drawer is open. Use the Drawer's onOpenChange callback to track open/close state. When the drawer is open, hide the status buttons row at the bottom of MobileBottomBar. `[MODIFY]`
2. **Implement gallery dialog in MobileBottomBar** — The isGalleryOpen state exists but is never used. Add a Dialog component that renders ObjectPhotoGallery when isGalleryOpen is true. Include a close button and proper dialog header. Pass onClose callback to close the dialog. `[MODIFY]`
3. **Add visible close button to photo lightbox** — In ObjectPhotoGallery, add an explicit X close button to the lightbox Dialog that's clearly visible on mobile. Position it in the top-right corner with sufficient tap target size (at least 44x44px for mobile accessibility). `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` MobileBottomBar has a boolean state `isDrawerOpen` initialized to false, updated via Drawer's `onOpenChange` prop  
  *Verify:* Read MobileBottomBar.tsx and verify useState for isDrawerOpen and onOpenChange callback on Drawer component
- `[c2]` The status buttons row (lines 168-210 area) is conditionally rendered only when `!isDrawerOpen`  
  *Verify:* Read MobileBottomBar.tsx and verify the status row section has `{!isDrawerOpen && isPM && selectedObject && ...}` conditional
- `[c3]` A Dialog wraps ObjectPhotoGallery and renders when `isGalleryOpen` is true, with `onOpenChange` bound to `setIsGalleryOpen`  
  *Verify:* Read MobileBottomBar.tsx and find Dialog component with open={isGalleryOpen} containing ObjectPhotoGallery
- `[c4]` ObjectPhotoGallery lightbox Dialog (line 286 area) contains an explicit Button with X icon for closing, positioned at top-right with min size h-10 w-10  
  *Verify:* Read ObjectPhotoGallery.tsx and verify close button inside DialogContent with X icon and appropriate sizing
- `[c5]` TypeScript type checking passes with `npm run check`  
  *Verify:* Run `npm run check` and verify no type errors

**Risks:**
- Drawer component from shadcn/ui may not expose onOpenChange or may have different API - need to verify component signature
- The gallery dialog might conflict with existing Drawer z-index layering
- Photo count is already displayed on the PHOTO button (line 151) so that part of the request is already implemented

---

