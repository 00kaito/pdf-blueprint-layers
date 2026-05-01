# Conversation Log — TASK-1BE28E

**Task:** po kliknieciu w obiekt chce miec mozliwosc uploadu zdjecia (ktore musi przejsc przez kompresje by optymalizowac wielkosc projektu) - zdjecie bedzie zwiazane z tym obiektem - bedzie to zdjecie wygladu tej lokalizacji na planie, wiec po klinieciu w obiekt po prawej stronie w ustawienia obiektu, chce widziec galerie zdjec ktora bedzie mozliwa do powiekszenia i przegladania; Uwzglednij zdjecia przy zapisie i imporcie projektu

**Roles:** architect=Claude, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-01 13:55:20

### Claude (Architekt)

**Summary:** Add a compressed photo gallery per object: photos stored as base64 data URLs in EditorObject.photos[], managed via two new reducer actions, displayed as a thumbnail grid with a Dialog-based lightbox in PropertiesPanel, and serialized transparently in project export/import.

**Plan:**
1. **Extend EditorObject type and EditorAction union** — In types.ts add `photos?: string[]` field to EditorObject (stores compressed base64 data URLs). Add two new action types to EditorAction: `{ type: 'ADD_OBJECT_PHOTO'; payload: { id: string; photoDataUrl: string } }` and `{ type: 'REMOVE_OBJECT_PHOTO'; payload: { id: string; index: number } }`. `[MODIFY]`
2. **Add reducer cases for photo actions** — In editor-context.tsx add cases for ADD_OBJECT_PHOTO (appends photoDataUrl to the target object's photos array) and REMOVE_OBJECT_PHOTO (filters out the photo at the given index). Both produce a new objects array via immutable map. `[MODIFY]`
3. **Create image compression utility** — Create core/image-compress.ts exporting `compressImage(file: File): Promise<string>`. Uses Canvas API: draw image into a canvas capped at 1200px width (preserve aspect ratio), export as JPEG at quality 0.75. Returns a data URL string. Pure function, no React dependencies. `[CREATE]`
4. **Create ObjectPhotoGallery component** — Create components/editor/ObjectPhotoGallery.tsx. Props: `{ objectId: string; photos: string[] }`. Renders: (a) a hidden file input (accept='image/*', multiple) that on change calls compressImage for each file and dispatches ADD_OBJECT_PHOTO; (b) a thumbnail grid (3-column CSS grid, 80px cells, overflow-hidden rounded) — each thumbnail has an absolute-positioned trash icon button that dispatches REMOVE_OBJECT_PHOTO; (c) clicking any thumbnail opens a Dialog (from ui/dialog.tsx) showing the full-size photo with prev/next navigation buttons for browsing the gallery. `[CREATE]`
5. **Integrate gallery into PropertiesPanel** — In PropertiesPanel.tsx, below the Visual Styles section and above the Delete button, add a new section guarded by `!isMultiSelect`. Import ObjectPhotoGallery, render it passing `objectId={firstObject.id}` and `photos={firstObject.photos ?? []}`. Add a section header with an Image icon matching the existing section header style. `[MODIFY]`
6. **Ensure photos survive project export** — In useExport.ts inside the `handleExportProject` async callback, extend the finalObjects mapping to also convert any blob: URLs found inside obj.photos[] to data URLs using the existing toDataUrl helper. Change the per-object map to: if obj.photos?.length, resolve each photo string through toDataUrl and return obj with resolved photos array. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` EditorObject in client/src/lib/types.ts has optional field `photos?: string[]`  
  *Verify:* Read types.ts and confirm `photos?: string[]` exists on the EditorObject interface
- `[c2]` EditorAction union in types.ts includes both ADD_OBJECT_PHOTO (payload: {id: string; photoDataUrl: string}) and REMOVE_OBJECT_PHOTO (payload: {id: string; index: number})  
  *Verify:* Read types.ts and confirm both action type literals are present in the EditorAction union
- `[c3]` editorReducer in editor-context.tsx handles ADD_OBJECT_PHOTO by appending photoDataUrl to the matching object's photos array, and REMOVE_OBJECT_PHOTO by filtering out the photo at the given index  
  *Verify:* Read editor-context.tsx and confirm case branches for both action types exist with correct immutable array operations
- `[c4]` File client/src/core/image-compress.ts exists and exports a function `compressImage` with signature `(file: File) => Promise<string>`  
  *Verify:* Read image-compress.ts and confirm the export signature; confirm it uses HTMLCanvasElement and toDataURL('image/jpeg', 0.75)
- `[c5]` File client/src/components/editor/ObjectPhotoGallery.tsx exists and accepts props { objectId: string; photos: string[] }  
  *Verify:* Read ObjectPhotoGallery.tsx and confirm the component definition with those props
- `[c6]` PropertiesPanel.tsx renders ObjectPhotoGallery when exactly one object is selected (isMultiSelect is false), passing firstObject.id and firstObject.photos  
  *Verify:* Read PropertiesPanel.tsx and confirm the conditional render block with ObjectPhotoGallery and correct props
- `[c7]` handleExportProject in useExport.ts iterates obj.photos and calls toDataUrl on each item, replacing any blob: URLs with data URLs before JSON serialization  
  *Verify:* Read useExport.ts and confirm the finalObjects map includes a photos array resolution step using toDataUrl
- `[c8]` IMPORT_PROJECT reducer case in editor-context.tsx already spreads the full payload including objects with their photos arrays — no additional import-side code needed  
  *Verify:* Read editor-context.tsx IMPORT_PROJECT case and confirm it does `{ ...state, ...action.payload }` which will carry over objects[].photos

**Risks:**
- Base64 JPEG data URLs for many photos can make project.json files large (10-50 MB for 20+ photos per object) — the 1200px/0.75 quality cap is the primary mitigation; users should be informed thumbnails are not lossless
- Canvas API toDataURL is synchronous but drawImage with large source files blocks the main thread — for files >5 MB the compression step may cause a brief UI freeze; createImageBitmap + OffscreenCanvas would fix this but adds complexity
- The Dialog-based lightbox in ObjectPhotoGallery requires the Dialog component from ui/dialog.tsx to support arbitrary image content — verify it does not impose a max-width that would crop landscape photos
- blob: URLs created by the browser (e.g. from drag-and-drop) are revoked on page reload and cannot survive a project save unless converted to data URLs at upload time — the compressImage path (FileReader → canvas → dataURL) avoids this, but any future code path that stores a blob: URL directly into photos[] would break import

---

