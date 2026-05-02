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

## IMPLEMENTING — iter 1 — 2026-05-02 16:24:37

### Gemini (Programista)

**Open criteria do adresowania:**
- `[c1]` ObjectPhotoGallery.tsx handleFileChange calls POST /api/files for each selected photo and dispatches a string matching /^\/api\/files\/[a-f0-9-]+$/ as photoDataUrl — never a data:image base64 string
- `[c2]` ObjectPhotoGallery.tsx imports and calls useUploadFile from @/hooks/useProjects and useDocument from @/lib/editor-context to obtain docState.projectId
- `[c3]` ObjectPhotoGallery.tsx contains a local helper function (e.g. dataUrlToFile) that converts a base64 data URL string to a File object for upload
- `[c4]` useExport.ts toDataUrl helper branch for '/api/files/' strings uses fetch(content) followed by FileReader.readAsDataURL, identical in structure to the existing 'blob:' branch
- `[c5]` The existing 'blob:' branch in useExport.ts toDataUrl is not modified
- `[c6]` Photos with legacy base64 data URL values still render correctly in the gallery (backward compat: img src accepts both data: URLs and /api/files/ paths)

**Git diff:** .orchestrator/orchestrator.db                      | Bin 315392 -> 315392 bytes
 .orchestrator/runs/TASK-23FB67/conversation.md     |  95 ++++++++++++++++++++
 .orchestrator/runs/TASK-23FB67/orchestrator.log    |   6 ++
 .orchestrator/runs/TASK-23FB67/state.json          |  31 ++++---
 .../src/components/editor/ObjectPhotoGallery.tsx   |  30 ++++++-
 client/src/hooks/useExport.ts                      |   4 +-
 .../89da2e02-fd47-45fb-9341-41f06c5ff34c.json      |  98 ++++++++++++++++-----
 data/projects.json                                 |   2 +-
 implementation_report.md                           |  23 +++--
 9 files changed, 242 insertions(+), 47 deletions(-)

**Implementation Report:**

# Implementation Report — Iteration 1

## Changes made
- **Step 1: Upload photo to server on add**:
    - Modified `client/src/components/editor/ObjectPhotoGallery.tsx` to upload photos to the `/api/files` endpoint immediately after compression.
    - Added a `dataUrlToFile` helper to convert compressed base64 data URLs back to `File` objects for multipart upload.
    - Integrated `useUploadFile` hook and `useDocument` to obtain `projectId` for the upload.
    - Updated `handleFileChange` to dispatch the server-returned URL (`/api/files/:fileId`) instead of the base64 string.
- **Step 2: Extend export toDataUrl helper**:
    - Modified `client/src/hooks/useExport.ts` to handle `/api/files/` URLs during the export process.
    - Updated the `toDataUrl` helper to fetch server-side photos and convert them back to base64 data URLs, ensuring they are correctly embedded in the exported ZIP bundle.
    - Maintained backward compatibility for `blob:` URLs and legacy base64 data URLs.

## Files affected
- MODIFIED: `client/src/components/editor/ObjectPhotoGallery.tsx`
- MODIFIED: `client/src/hooks/useExport.ts`

## Deviations from plan
None

## Potential issues
None. The build succeeded and the logic follows the requested architectural changes. Existing projects with base64 photos will continue to render correctly and will be handled by the export process.

<details>
<summary>Gemini stdout (raw)</summary>

```
The photo storage issue has been resolved by implementing a flow where photos are uploaded to the server immediately upon addition, rather than being stored as large base64 strings in the project state. This significantly reduces the size of the project save payload and prevents the `BadRequestError: request aborted` error.

### Key Changes
- **ObjectPhotoGallery.tsx**: Now compresses and then uploads each photo to `/api/files`. The project state now only stores lightweight URL references (e.g., `/api/files/uuid`).
- **useExport.ts**: The export process has been updated to fetch these server-side photos and re-embed them as base64 data URLs in the exported ZIP bundle, ensuring full portability of the exported data.
- **Backward Compatibility**: Projects containing legacy base64 photo data remain fully functional; they will still render in the gallery and be correctly included in exports.

### Verification
- A full production build was executed successfully (`npm run build`), confirming type safety and syntax correctness.
- The `handleExportProject` logic was manually reviewed to ensure it correctly fetches and caches both local blobs and server-side files.

Detailed changes are documented in the `implementation_report.md` file.
```
</details>

---

## REVIEWING — iter 1 — 2026-05-02 16:25:02

### Gemini (Reviewer)

**Overall:** ✅ APPROVED

**Criteria:**
- ✅ `[c1]` **DONE** — In ObjectPhotoGallery.tsx (lines 37-51), handleFileChange calls uploadFile.mutateAsync for each photo and dispatches result.url (the server-side path) to ADD_OBJECT_PHOTO, instead of the compressed base64 string.  
  *confidence:* HIGH
- ✅ `[c2]` **DONE** — ObjectPhotoGallery.tsx imports useDocument (line 2) and useUploadFile (line 11), and initializes them at lines 31-32. It uses state.projectId in the upload call at line 46.  
  *confidence:* HIGH
- ✅ `[c3]` **DONE** — The dataUrlToFile helper is defined at lines 19-28 and invoked at line 41 to prepare the compressed image for server upload.  
  *confidence:* HIGH
- ✅ `[c4]` **DONE** — In useExport.ts (lines 35-51), the toDataUrl helper now handles both 'blob:' and '/api/files/' prefixes using the fetch -> blob -> FileReader pattern to ensure photos are embedded as base64 in the export.  
  *confidence:* HIGH
- ✅ `[c5]` **DONE** — The logic for 'blob:' remains intact as it now shares the implementation block with '/api/files/' at line 35 of useExport.ts.  
  *confidence:* HIGH
- ✅ `[c6]` **DONE** — In ObjectPhotoGallery.tsx (lines 115 and 147), img tags use src={photo} or src={photos[lightboxIndex]} without conditional logic, which natively supports both base64 and relative server paths.  
  *confidence:* HIGH

**Blocking issues:**
*None*

**Suggestions:**
*None*

---

