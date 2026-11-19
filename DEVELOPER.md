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
| `components/editor/Canvas/*` | Layers of the canvas: `PdfPageCanvas` (the PDF page, double-buffered) and `PdfDetailLayer` (sharp visible part at high zoom) — see §3; `OverlayDocument`; `ObjectRenderer` (one object: drag, rotate, label, touch gestures), `JumperLayer`, `MeasureLayer` (scale probe, tape), `PathMeasureLayer`, `RouteLayer`, `CoverageLayer`, `WallPreview`, `GuidesLayer`, `CropLayer`, `ToolHint` |
| `components/editor/LayerPanel.tsx` | Layers & objects list: visibility, rename, status dots, drag & drop of objects (order / layer) |
| `components/editor/BulkLabelInput.tsx` | Label field for one or many objects: numbering patterns, *Chain* / *By IDF* numbering |
| `components/editor/JumperEditor.tsx`, `JumperCablesPicker.tsx`, `MobileJumpers.tsx` | Jumpers of the selected object (desktop / tablet), the cables picker, the phone's chip + sheet |
| `components/editor/ResizeByPercent.tsx` | Resize the selection by a percentage (the only way to resize: objects have no resize handles) |
| `components/editor/Toolbar/*` | Desktop toolbar (`ToolSelector`, `ContextBar` with the active tool's options, `MainMenu`, cabling / CCTV tools) and the phone's `MobileMenu` |
| `components/editor/MobileBottomBar.tsx` | Phone: status, cables, photos, move for the selected object |
| `components/editor/PropertiesPanel.tsx`, `PMObjectDetailsPanel.tsx` | Object properties (desktop side panel / touch details) |
| `components/editor/TechRequests.tsx` | Change requests: "send as request?" dialog, technician's edit form (long press), request section, *Requests* button |
| `components/editor/TechPermissionsDialog.tsx` | Per-project technician permissions |
| `components/editor/ZipImport.tsx`, `ImportedPeople.tsx`, `AdminBackup.tsx` | ZIP import with the *Who is who?* dialog; linking imported people; server backup |
| `core/*` | Pure logic, no React: `constants` (incl. zoom limits and canvas budgets), `pdf-math` (coordinates / rotation), `measure`, `lv-icons` (device icons, cable defaults, labels), `status`, `cable-routing` (also the numbering orders `orderByIdfDistance`, `orderByNearestChain`), `label-pattern` (`%1` numbering), `jumpers` (geometry, colours, shown statuses — see §6), `camera-coverage`, `camera-placement` (+ web worker), `pdf-lv-export`, `snapping`, `flood-fill`, `replace-object`, `plan-change`, `pointer-input` |
| `lib/editor-context.tsx` | The reducer and its two contexts (see §2) |
| `lib/types.ts` | `EditorObject`, `DocumentState`, `UIState`, `EditorAction` |
| `lib/history.ts` | Undo / redo (100 steps, edits of the same kind within 1 s are one step) |
| `lib/merge-state.ts`, `server-owned.ts`, `live-revision.ts` | Three-way merge of plans, server-owned fields, the revision this tab is based on |
| `hooks/*` | `useAutoSave` / `useManualSave` (PM saves), `useLiveSync` + `useRemoteMerge` (live updates), `useProjectOps` (send ops), `useFieldActions` (status / label / technician changes for both roles), tool hooks (`useDrawing`, `useMeasure`, `usePathMeasure`, `useRouteDrawing`, `useWallDrawing`, `useJumperDrawing`, `useMarquee`), gestures (`useTouchGestures`, `usePinchZoom`, `useFingerPan`, `useSpacePan`), `usePdfPage` (loads one page of a PDF), `useExport` / `useImport` |

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
| `shared/jumpers.ts` | Jumper type, statuses, `normalizeJumper`, `gatedStatus`, `withNewerJumperStatuses` (used by client and server) |

---

## 2. Editor state

`lib/editor-context.tsx` holds one reducer whose state is split in two contexts, so that fast UI
changes do not re-render components that only read the plan:

- **`DocumentState`** (`useDocument()`): what is saved: layers, objects, cable routes, settings
  (`lvSettings`, incl. `techPermissions`), calibration, export settings, file ids, `projectId`.
- **`UIState`** (`useUI()` / `useUIDispatch()`): this screen only: zoom, tool, selection,
  measuring tape, path measure points, a technician's local label offsets, jumper visibility /
  filter / draft, open dialogs. The scroll position is **not** kept in state (read it from the
  `[data-canvas-scroller]` element): dispatching on every scroll re-rendered the whole editor
  ~60× a second while panning. `scrollPos` / `SET_SCROLL` remain only as a fallback nobody updates.

Rules:
- Every change is an action (`EditorAction` in `lib/types.ts`) handled in `baseReducer`; add the
  action type, the case, and (for undoable document changes) a label in `lib/history.ts`.
- Components that render per object (`ObjectRenderer`) get what they need as props from `Canvas`;
  do not call `useDocument()` there (every object would re-render on any change).
- New saved fields of a plan go into `DocumentState`, `SYNCED_KEYS` / `toSyncedDoc` in
  `lib/merge-state.ts` and the save payload; `projectStateSchema` accepts unknown nested data in
  `lvSettings` / `objects`, so settings can usually live in `lvSettings` (defaults filled in by
  `normalizeLvSettings`).
- **Object order:** the order of `objects` is the drawing order (later = on top) and the order of
  the Layers & Objects list. `MOVE_OBJECTS_IN_LIST` (`{ ids, layerId, beforeId }`) moves objects
  before `beforeId` (null = after the last object of `layerId`) and into that layer, keeping the
  moved ones' own order; it returns the same state when nothing moves (no empty undo step). The
  server keeps the order of a save; a three-way merge after a conflict takes the remote order.

---

## 3. Rendering the plan (PDF)

The PDF page is **not** drawn by react-pdf's `<Page>`: it keys its canvas by the scale, so every zoom
remounted an empty canvas and the blueprint blinked out until it was re-rendered. `<Document>` only
loads the file; `usePdfPage` gets the page and the app draws it.

- **`PdfPageCanvas`** keeps one canvas element. On a zoom its CSS size changes at once (the old
  pixels are stretched), the new resolution is rendered into an offscreen canvas and copied in when
  complete — no blank frame. It does nothing when the pixel size is unchanged.
- **Canvas budgets** (`core/constants.ts`): mobile browsers silently draw nothing on canvases over
  ~16.7 MPx (iOS Safari), which made the plan vanish at high zoom. The whole page is capped at
  `PAGE_CANVAS_PIXELS` (8 MPx); above it its pixel size is derived from the aspect ratio only, so it
  is identical at every higher zoom and never re-rendered — it is just CSS-stretched.
- **`PdfDetailLayer`** draws, when the page canvas is below the screen's resolution, the visible part
  (+25% margin, within `MAX_CANVAS_PIXELS`) at full resolution on top, ~120 ms after scrolling /
  zooming stops. Its pixels, position and size are set imperatively in one step (through React state
  the new pixels showed at the old position for a frame — the plan "jumped" while panning). On a zoom
  it is stretched to the new zoom until the sharp one is ready; a render started at another zoom is
  never shown.
- **Zoom:** `MIN_SCALE` / `MAX_SCALE` (0.1–13) in `core/constants.ts`, shared by the toolbar,
  `usePinchZoom` (pinch and `Ctrl` + wheel: a CSS-transform preview, the real zoom committed once at
  the end) and anything else that sets the scale.
- The overlay PDF uses `PdfPageCanvas` too (no detail tile). The paint bucket reads the page canvas
  (`pageCanvasRef`); it works on a downscaled copy, so the canvas resolution does not matter.

---

## 4. Saving and live sync

- **PM / admin** save the whole plan: `useAutoSave` → `PUT /api/projects/:id?base=<revision>`.
  A stale `base` gets `409` with the stored plan; `useRemoteMerge` merges it three-way (base = the
  plan as last received, local, remote; per object and per field) and saves again.
- **Server-owned fields** (`SERVER_OWNED_FIELDS` in `shared/tech-ops.ts`: comments, photos,
  `photoBy`, `techRequest`, `requestResult`) are changed only by ops; `mergeManagerSave` keeps the
  stored values on a PM save. Status and label position keep whichever change is newer
  (`statusUpdatedAt`, `labelUpdatedAt`); so does each jumper's status, per jumper
  (`withNewerJumperStatuses`, on the server and when a PM tab takes in remote changes).
  `importedPeople` is kept by the save route.
- **Live updates:** every save / op bumps `revision` and calls `publishRevision`; open tabs get it
  over SSE (`useLiveSync`), fetch `/live?rev=` and merge (PM) or replace (technician) their plan.
  A 30 s poll catches up after lost connections. The SSE registry is in-process (one server instance).

---

## 5. Field operations and technician permissions

Technicians never `PUT` the plan. Every action is an op (`TechOp`) sent by `useProjectOps` to
`POST /api/projects/:id/ops`; the server applies it with `applyOps` under the project lock:

| Op | Who | Effect |
|---|---|---|
| `status` | all | Status (+ issue text), with who / when |
| `jumperStatus` | all (sent by technicians; a PM's change is part of the save) | Status of one jumper (`objectId` = its "from" object), with who / when; only `JUMPER_STATUSES` |
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

## 6. Jumpers

Cables between two objects (not home-runs to an IDF). Types and helpers shared with the server are in
`shared/jumpers.ts`; geometry, colours and counts in `core/jumpers.ts`.

- **Storage:** each jumper lives on its "from" object (`EditorObject.jumpers`, `toId` = the other
  end), so it is saved, synced, merged and undone with that object — no separate list.
  `cables: { type, count }[]` (at least one; jumpers of the first version with a single
  `type` / `count` are converted by `normalizeJumper`), optional `points` (waypoints), `lengthFt`
  (by hand; else measured on the plan + device slack at both ends, `jumperFeet`), `label`, status.
- **Actions:** `ADD_JUMPER`, `UPDATE_JUMPER`, `UPDATE_JUMPERS` (the same change on several — "Mark
  all pulled" is one undo step), `DELETE_JUMPER`. Deleting an object drops the jumpers ending at it
  (`withoutJumpersTo`); copy / paste keeps jumpers between pasted objects only, with new ids and a
  fresh status (`remapJumpers`). Only icons and images can have jumpers (`canHaveJumpers`).
- **Status:** `PLANNED` / `CABLE_PULLED` only. `withShownStatuses` / `gatedStatus` give the status an
  object is *shown* with: pulled or later shows Planned while a jumper at it is not pulled. Use the
  shown status wherever a status is displayed or counted (plan, list dots, progress, PDF); store
  and edit the real one. Technicians send `jumperStatus` ops (`useFieldActions`).
- **Drawing:** `allJumpers` lists every link; `layoutJumpers` lays out all of them at once (several
  between the same two objects bend apart, always to the same side), so filtering never moves a
  line. `JumperLayer` draws them; `jumperPolyline` gives the arc as straight pieces for the PDF
  (`drawJumpers` / jumper tables in `pdf-lv-export.ts`). UI: `showJumpers` + `jumperFilter` (types);
  the selected object's jumpers are always drawn.
- **Tool:** `jumper` (`useJumperDrawing`, draft in `UIState.jumperDraft`, the last used cables in
  `jumperCables`).

---

## 7. Import / export

`server/backup.ts` writes and reads one ZIP format for a project and for the whole server:
`backup.json` (manifest: version, `serverId`, scope, people as `{id, username}` only),
`projects/<id>/state.json`, `projects/<id>/files/<fileId>`, `icons/<id>`. On import all ids are
remapped, people are mapped to accounts only as the importer chose (or kept, same server), files
get a safe MIME type, and a failure deletes everything created so far. Passwords, e-mails and
accounts never travel.

---

## 8. How to add…

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

## 9. Installable app (PWA)

- `client/public/manifest.webmanifest` (name, colours, icons), `client/public/sw.js` (service worker:
  only page loads that fail offline get `offline.html`; API, files and assets are never touched or
  cached) and the `apple-*` tags in `client/index.html` (iPhone / iPad home screen).
- `lib/install-app.ts` registers the worker and keeps Chrome's `beforeinstallprompt` (captured
  in `main.tsx` before React renders); `components/InstallApp.tsx` has the *Install app* button /
  action and the steps dialog for Safari and browsers without a prompt.
- Icons in `client/public/icons/` are generated from the favicon design:
  `npx tsx script/generate-pwa-icons.ts` (plain Node, no image libraries).
- When `sw.js` changes, bump its `CACHE` name so old offline pages are dropped.

---

## 10. Conventions and checks

- `npm run check` (TypeScript) must pass. There is no unit-test runner in the repo; server logic in
  `shared/tech-ops.ts` and `server/backup.ts` can be exercised with a `tsx` script.
- Building needs Node 20.19+ / 22.12+ (Vite 7).
- Comments explain *why*; user-facing texts are English.
- Toolbar toggles: an on/off **setting** (snap, show routes / jumpers…) uses the `Toggle`
  variant `"switch"` (light tint when on); only the **tool in use** is a solid button.
- Line endings: some files are CRLF in the repository (e.g. `server/routes.ts`,
  `server/databaseStorage.ts`, `shared/schema.ts`, several hooks). Keep a file's existing line
  endings (`git ls-files --eol <file>`); tools like `sed` on Windows can silently convert them and
  produce whole-file diffs.
