# Conversation Log — TASK-4750FB

**Task:** wyedytowalem projekt - dodalem wiele zdjec w roznych lokacjach (przy roznych obiektach) przy probie zapisu projektu dostajeje error: BadRequestError: request aborted
    at IncomingMessage.onAborted (/home/hpz4/IdeaProjects/pdf-blueprint-layers/node_modules/raw-body/index.js:245:10)
    at IncomingMessage.emit (node:events:509:28)
    at IncomingMessage._destroy (node:_http_incoming:221:10)
    at _destroy (node:internal/streams/destroy:122:10)
    at IncomingMessage.destroy (node:internal/streams/destroy:84:5)
    at abortIncoming (node:_http_server:848:9)
    at socketOnClose (node:_http_server:842:3)
    at Socket.emit (node:events:521:24)
    at TCP.<anonymous> (node:net:350:12)


**Roles:** architect=Claude, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-02 16:23:44

### Claude (Architekt)

**Summary:** Photos are stored as base64 data URLs inline in EditorObject.photos[], causing the PUT /api/projects/:id JSON body to exceed tens of MB when many photos exist. Fix: upload each photo immediately to the existing /api/files endpoint on add, and store only the lightweight /api/files/:fileId URL reference in state.

**Plan:**
1. **Upload photo to server on add, store URL reference** — In ObjectPhotoGallery.tsx, replace the current flow (compress → dispatch base64 to state) with: compress → convert data URL to File → POST /api/files → dispatch /api/files/:fileId URL to state. Import useUploadFile from useProjects and useDocument to access docState.projectId. Add a local dataUrlToFile helper. Wrap in try/catch and show a console error on failure so the input is always reset. Remove the useUploadFile import from anywhere else if needed — but it already exists there. `[MODIFY]`
2. **Extend export toDataUrl helper to fetch /api/files/ URLs** — In useExport.ts, inside handleExportProject, extend the toDataUrl helper to also handle strings that start with '/api/files/' by calling fetch(content) the same way it already handles 'blob:' URLs. The existing photos mapping (obj.photos.map(photo => toDataUrl(photo))) will then correctly embed server-side photos as base64 data URLs in the exported ZIP bundle. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` ObjectPhotoGallery.tsx handleFileChange calls POST /api/files for each selected photo and dispatches a string matching /^\/api\/files\/[a-f0-9-]+$/ as photoDataUrl — never a data:image base64 string  
  *Verify:* Read ObjectPhotoGallery.tsx: confirm dispatch payload contains the fileId URL string returned from uploadFile.mutateAsync, not the result of compressImage directly
- `[c2]` ObjectPhotoGallery.tsx imports and calls useUploadFile from @/hooks/useProjects and useDocument from @/lib/editor-context to obtain docState.projectId  
  *Verify:* Read ObjectPhotoGallery.tsx: imports section and hook call sites both present
- `[c3]` ObjectPhotoGallery.tsx contains a local helper function (e.g. dataUrlToFile) that converts a base64 data URL string to a File object for upload  
  *Verify:* Read ObjectPhotoGallery.tsx: function exists and is called between compressImage and uploadFile.mutateAsync
- `[c4]` useExport.ts toDataUrl helper branch for '/api/files/' strings uses fetch(content) followed by FileReader.readAsDataURL, identical in structure to the existing 'blob:' branch  
  *Verify:* Read useExport.ts handleExportProject: toDataUrl contains an else-if (or combined condition) for content.startsWith('/api/files/')
- `[c5]` The existing 'blob:' branch in useExport.ts toDataUrl is not modified  
  *Verify:* Read useExport.ts: blob: handling block is unchanged from current implementation
- `[c6]` Photos with legacy base64 data URL values still render correctly in the gallery (backward compat: img src accepts both data: URLs and /api/files/ paths)  
  *Verify:* ObjectPhotoGallery.tsx img src={photo} is unchanged — no conditional rendering based on URL type

**Risks:**
- Photos added while the user session is expired or unauthenticated will fail silently — the POST /api/files returns 401 and the photo is not added; user sees no feedback unless an error toast is wired up
- Existing projects saved before this fix still have base64 data URLs in their photos arrays in the database — those projects continue to work (img src renders data: URLs correctly) but the large save payload issue recurs if the user saves again without re-adding photos; a one-time migration is not included in this plan
- Sequential upload of many photos (for loop with await) is slow on low-bandwidth connections — parallel upload with Promise.all would be faster but risks overloading the server with simultaneous multipart requests; sequential is the safer default
- useUploadFile uses fetch without the apiRequest wrapper, meaning CSRF protection (if ever added) would not apply to photo uploads

---

