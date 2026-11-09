# Developer Guide

How the code is organised and how the pieces work together. For running the app, the API list and
the feature overview see `README.md`.

---

## 1. Code map

### Client (`client/src`)

| Path | What lives there |
|---|---|
| `pages/home.tsx` | Project list (`PDFUploader`) or the editor; phone vs desktop / tablet layout |
| `pages/AdminPage.tsx`, `AuthPage.tsx` | User management + server backup; login / register |
| `components/editor/Canvas.tsx` | The plan: PDF page, overlay, and every layer drawn over it; routes pointer events to the active tool |
| `components/editor/Canvas/*` | Layers of the canvas: `ObjectRenderer` (one object: drag, resize, rotate, label, touch gestures), `MeasureLayer` (scale probe, tape), `PathMeasureLayer`, `RouteLayer`, `CoverageLayer`, `WallPreview`, `GuidesLayer`, `CropLayer`, `ToolHint` |
| `components/editor/Toolbar/*` | Desktop toolbar (`ToolSelector`, `ContextBar` with the active tool's options, `MainMenu`, cabling / CCTV tools) and the phone's `MobileMenu` |
| `components/editor/MobileBottomBar.tsx` | Phone: status, cables, photos, move for the selected object |
| `components/editor/PropertiesPanel.tsx`, `PMObjectDetailsPanel.tsx` | Object properties (desktop side panel / touch details) |
| `components/editor/TechRequests.tsx` | Change requests: "send as request?" dialog, technician's edit form (long press), request section, *Requests* button |
| `components/editor/TechPermissionsDialog.tsx` | Per-project technician permissions |
| `components/editor/ZipImport.tsx`, `ImportedPeople.tsx`, `AdminBackup.tsx` | ZIP import with the *Who is who?* dialog; linking imported people; server backup |
| `core/*` | Pure logic, no React: `pdf-math` (coordinates / rotation), `measure`, `lv-icons` (device icons, cable defaults, labels), `status`, `cable-routing`, `camera-coverage`, `camera-placement` (+ web worker), `pdf-lv-export`, `snapping`, `flood-fill`, `replace-object`, `plan-change`, `pointer-input` |
| `lib/editor-context.tsx` | The reducer and its two contexts (see §2) |
| `lib/types.ts` | `EditorObject`, `DocumentState`, `UIState`, `EditorAction` |
| `lib/history.ts` | Undo / redo (100 steps, edits of the same kind within 1 s are one step) |
| `lib/merge-state.ts`, `server-owned.ts`, `live-revision.ts` | Three-way merge of plans, server-owned fields, the revision this tab is based on |
| `hooks/*` | `useAutoSave` / `useManualSave` (PM saves), `useLiveSync` + `useRemoteMerge` (live updates), `useProjectOps` (send ops), `useFieldActions` (status / label / technician changes for both roles), tool hooks (`useDrawing`, `useMeasure`, `usePathMeasure`, `useRouteDrawing`, `useWallDrawing`, `useMarquee`), gestures (`useTouchGestures`, `usePinchZoom`, `useFingerPan`, `useSpacePan`), `useExport` / `useImport` |

### Server (`server`) and shared code (`shared`)

| Path | What lives there |
|---|---|
| `index.ts` | Express app start-up, admin seed |
| `config.ts` | All environment variables (see README) |
| `auth.ts` | Passport local strategy, sessions, `requireAuth` / `requireRole`, `seedAdminUser` |
| `routes.ts` | Every `/api` endpoint; `canAccess` (owner, shared, admin); `withProjectLock` (one state write at a time per project) |
| `live.ts` | Server-Sent Events: `openLiveStream`, `publishRevision` |
| `backup.ts` | Project / server ZIP export and import (id remapping, people mapping, rollback) |
| `server-id.ts` | Installation id, safe MIME types and security headers for served files |
| `storage.ts`, `storage_interface.ts`, `databaseStorage.ts`, `fileStorage.ts` | `IStorage` and its PostgreSQL / JSON-file implementations |
| `shared/schema.ts` | Drizzle tables and the Zod schema of a saved plan (`projectStateSchema`) |
| `shared/tech-ops.ts` | Field operations: types, `applyOps`, `mergeManagerSave`, change requests, technician permissions |

---

## 2. Editor state

`lib/editor-context.tsx` holds one reducer whose state is split in two contexts, so that fast UI
changes do not re-render components that only read the plan:

- **`DocumentState`** (`useDocument()`): what is saved: layers, objects, cable routes, settings
  (`lvSettings`, incl. `techPermissions`), calibration, export settings, file ids, `projectId`.
- **`UIState`** (`useUI()` / `useUIDispatch()`): this screen only: zoom, scroll, tool, selection,
  measuring tape, path measure points, a technician's local label offsets, open dialogs.

Rules:
- Every change is an action (`EditorAction` in `lib/types.ts`) handled in `baseReducer`; add the
  action type, the case, and (for undoable document changes) a label in `lib/history.ts`.
- Components that render per object (`ObjectRenderer`) get what they need as props from `Canvas`;
  do not call `useDocument()` there (every object would re-render on any change).
- New saved fields of a plan go into `DocumentState`, `SYNCED_KEYS` / `toSyncedDoc` in
  `lib/merge-state.ts` and the save payload; `projectStateSchema` accepts unknown nested data in
  `lvSettings` / `objects`, so settings can usually live in `lvSettings` (defaults filled in by
  `normalizeLvSettings`).

---

## 3. Saving and live sync

- **PM / admin** save the whole plan: `useAutoSave` → `PUT /api/projects/:id?base=<revision>`.
  A stale `base` gets `409` with the stored plan; `useRemoteMerge` merges it three-way (base = the
  plan as last received, local, remote; per object and per field) and saves again.
- **Server-owned fields** (`SERVER_OWNED_FIELDS` in `shared/tech-ops.ts`: comments, photos,
  `photoBy`, `techRequest`, `requestResult`) are changed only by ops; `mergeManagerSave` keeps the
  stored values on a PM save. Status and label position keep whichever change is newer
  (`statusUpdatedAt`, `labelUpdatedAt`). `importedPeople` is kept by the save route.
- **Live updates:** every save / op bumps `revision` and calls `publishRevision`; open tabs get it
  over SSE (`useLiveSync`), fetch `/live?rev=` and merge (PM) or replace (technician) their plan.
  A 30 s poll catches up after lost connections. The SSE registry is in-process (one server instance).

---

## 4. Field operations and technician permissions

Technicians never `PUT` the plan. Every action is an op (`TechOp`) sent by `useProjectOps` to
`POST /api/projects/:id/ops`; the server applies it with `applyOps` under the project lock:

| Op | Who | Effect |
|---|---|---|
| `status` | all | Status (+ issue text), with who / when |
| `label` | all | Label position |
| `comment`, `deleteComment` | all (own comments; PM any) | Threaded comments |
| `addPhoto`, `removePhoto` | all (own photos; PM any) | Photos (the file must have been uploaded by the same user) |
| `request` | TECH | Change request (move / label / cables / IDF); joins the technician's pending one |
| `edit` | TECH | Direct change, only for fields the project allows *Without approval*; records `editedBy` / `editedAt` |
| `cancelRequest` | author, PM | Withdraw a request |
| `resolve` | PM, admin | Approve (applies the changes) or reject (reason → comment) |

**Technician permissions** (`lvSettings.techPermissions`, `TechPermissions` in `shared/tech-ops.ts`):
for each of `move`, `label`, `cables`, `idf` one of `off` / `request` / `direct` (default `request`).
`splitChanges` sorts a set of changes by the setting; the server refuses a `request` with an `off`
field and an `edit` with anything that is not `direct`. Input is checked by `cleanChanges`
(finite coordinates, label ≤ 200 characters, known cable types, counts 1–999).

On the client every technician change goes through one channel: `useFieldActions().requestChange`
puts it into `UIState.techRequestDraft`; `TechRequestDialog` sends the `direct` part at once
(`sendTechChanges`: shown immediately, put back if the server refuses), refuses the `off` part and
asks "send as request?" for the rest. The long-press form (`TechEditDialog`) uses `sendTechChanges`
directly. UI gating uses `useFieldActions().techMode(field)`.

---

## 5. Import / export

`server/backup.ts` writes and reads one ZIP format for a project and for the whole server:
`backup.json` (manifest: version, `serverId`, scope, people as `{id, username}` only),
`projects/<id>/state.json`, `projects/<id>/files/<fileId>`, `icons/<id>`. On import all ids are
remapped, people are mapped to accounts only as the importer chose (or kept, same server), files
get a safe MIME type, and a failure deletes everything created so far. Passwords, e-mails and
accounts never travel.

---

## 6. How to add…

- **A device icon:** an entry in `LV_ICONS` (`core/lv-icons.ts`, 24×24 outline path; it is used for
  the canvas and the PDF), plus optional `DEFAULT_MOUNT_HEIGHT_IN` and `cableDefaults`. Lists,
  pickers and export pick it up from `LV_ICON_TYPES`.
- **A canvas tool:** the id in `UIState['tool']`; a hook for its pointer handling (see
  `useWallDrawing` / `usePathMeasure`); route events in `Canvas.handlePointerDown` / `handleClick`;
  a layer component under `Canvas/`; a button in `ToolSelector` (and `ContextBar` options, a
  `ToolHint` line). If clicks must reach the plan through objects, add the tool to the
  `pointer-events-none` condition in `ObjectRenderer`. Technicians are forced back to `select`
  unless the tool is allowed in the `isTech` effect in `Canvas`.
- **A field op:** a `TechOp` variant and its case in `applyOps` (validate input there, it comes from
  the client), then send it with `useProjectOps`.
- **A database column / table:** `shared/schema.ts`, then `npm run db:push` locally (Docker does
  it on start); data that belongs to a plan usually goes into the `state` JSON instead.
- **An endpoint:** `server/routes.ts`; check `requireRole` and `canAccess`, and wrap state writes in
  `withProjectLock` + `publishRevision`.

---

## 7. Conventions and checks

- `npm run check` (TypeScript) must pass. There is no unit-test runner in the repo; server logic in
  `shared/tech-ops.ts` and `server/backup.ts` can be exercised with a `tsx` script.
- Building needs Node 20.19+ / 22.12+ (Vite 7).
- Comments explain *why*; user-facing texts are English.
- Line endings: some files are CRLF in the repository (e.g. `server/routes.ts`,
  `server/databaseStorage.ts`, `shared/schema.ts`, several hooks). Keep a file's existing line
  endings (`git ls-files --eol <file>`); tools like `sed` on Windows can silently convert them and
  produce whole-file diffs.
