# PDF Blueprint Layers

A web application for marking up building plans (PDF) with network infrastructure: sockets, cameras, cable runs and IDF/patch-panel connections. Project managers prepare the plan; technicians in the field update installation status and attach photos, including from a phone.

---

## Running the application

### Option A — Docker Compose (recommended)

Requires Docker Desktop (or Docker Engine with the Compose plugin).

```bash
docker compose up -d --build
```

- App: **http://localhost:5000**
- PostgreSQL: `localhost:5435` (user `user`, password `password`, db `pdf_blueprint`)

On every start the container runs `drizzle-kit push` (creates or updates the schema to match `shared/schema.ts`); the server then seeds an admin account if there is none:

| Username | Password | Role  |
|----------|----------|-------|
| `admin`  | `2Park`  | admin |

Change this password after the first login (Admin page → Users) if the instance is reachable by anyone else.

Useful commands:

```bash
docker compose logs -f app      # follow app logs
docker compose up -d --build app # rebuild after code changes
docker compose down             # stop (data is kept)
docker compose down -v          # stop and delete the database volume
```

Configuration (set in the shell or a `.env` file next to `docker-compose.yml`):

| Variable            | Default                  | Purpose                                      |
|---------------------|--------------------------|----------------------------------------------|
| `DB_HOST_PORT`      | `5435`                   | Host port for PostgreSQL (container uses 5432) |
| `POSTGRES_USER`     | `user`                   | Database user                                |
| `POSTGRES_PASSWORD` | `password`               | Database password                            |
| `POSTGRES_DB`       | `pdf_blueprint`          | Database name                                |
| `SESSION_SECRET`    | `some-very-secret-key`   | Session cookie signing key — **change it in production** |

Uploaded files are stored in `./storage` on the host (bind-mounted into the container), so they survive rebuilds. PostgreSQL data lives in the `postgres_data` volume.

Server variables (read by `server/config.ts`; Compose sets `DATABASE_URL`, `SESSION_SECRET`, `PORT` and `DB_SSL` itself — for anything else, run the app outside Compose or add it to `docker-compose.yml`):

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection; without it the app uses file storage |
| `PORT` | `5000` | HTTP port of the app |
| `STORAGE_TYPE` | `database` with `DATABASE_URL`, else `file` | Storage backend |
| `STORAGE_DIR` | `storage` | Folder for uploaded files and `server-id` — must be persistent |
| `DB_SSL` | `false` | `true` = TLS to PostgreSQL |

### Option B — Local development

Requires Node.js 20.19+ (or 22.12+; Vite 7 does not build on older Node 20 releases).

```bash
npm install
npm run dev
```

The dev server (Express + Vite with HMR) runs on **http://localhost:5000**.

Storage backend is selected automatically:

- **No `DATABASE_URL`** → file storage in `./data` (JSON files) with in-memory sessions. Nothing else to set up.
- **`DATABASE_URL` set** → PostgreSQL. Create the schema first with `npm run db:push`.

To develop against the Compose database, create a `.env` file in the project root (it is loaded automatically by `server/config.ts`):

```env
DATABASE_URL=postgresql://user:password@localhost:5435/pdf_blueprint
SESSION_SECRET=dev-secret
```

> **Windows:** `npm run dev` uses the Unix `NODE_ENV=... ` syntax, which fails in `cmd`/PowerShell. Run `npx tsx server/index.ts` instead (development is the default mode), or run npm from Git Bash.

### Scripts

| Command              | Description                                                        |
|----------------------|--------------------------------------------------------------------|
| `npm run dev`        | Dev server with Vite middleware and HMR                            |
| `npm run build`      | Builds the client to `dist/public` and bundles the server to `dist/index.cjs` |
| `npm start`          | Runs the production build                                          |
| `npm run check`      | TypeScript type check                                              |
| `npm run db:push`    | Syncs `shared/schema.ts` to the database (Drizzle)                 |
| `npm run db:migrate` | One-off migration of file-storage data (`./data`) into PostgreSQL |

---

## Architecture

```
┌─────────────────────────── Browser (React SPA) ────────────────────────────┐
│  pages/  AuthPage · home (project list + editor) · AdminPage               │
│  components/editor/  Canvas (+ layers) · Toolbar · LayerPanel · panels …   │
│  lib/    editor-context (reducer: DocumentState + UIState) · history ·     │
│          merge-state (3-way merge) · live-revision                         │
│  hooks/  useAutoSave · useLiveSync · useProjectOps · useFieldActions …     │
│  core/   pure logic: pdf-math · measure · cable-routing · camera-coverage  │
│          · lv-icons · status · pdf-lv-export …                             │
└──────────────┬───────────────────────────────────────────────▲─────────────┘
               │ REST /api/* (session cookie, TanStack Query)   │ SSE: new revision
┌──────────────▼────────────── Express server (Node 20) ───────┴─────────────┐
│  auth.ts       Passport local, bcrypt, sessions, role guards, admin seed   │
│  routes.ts     auth · projects · ops · live · sharing · files · icons ·   │
│                import/export · admin                                      │
│  live.ts       Server-Sent Events: open plans hear about every save / op  │
│  backup.ts     project / server ZIP export and import                     │
│  shared/tech-ops.ts  field operations (status, photos, comments, change   │
│                requests, technician edits) — checked and applied here     │
│  storage.ts    picks an IStorage implementation:                          │
│     ├─ DatabaseStorage → PostgreSQL (Drizzle) + files on disk ./storage   │
│     └─ FileStorage     → JSON files + uploads in ./data                   │
└────────────────────────────────────────────────────────────────────────────┘
```

### Repository layout

| Path        | Contents                                                                 |
|-------------|--------------------------------------------------------------------------|
| `client/`   | React 19 + Vite + Tailwind + shadcn/ui front end                         |
| `server/`   | Express API, authentication, storage implementations, live updates, backup, static/Vite serving |
| `shared/`   | `schema.ts` — Drizzle tables and Zod validation; `tech-ops.ts` — field operations shared by client and server |
| `script/`   | Build script (Vite + esbuild) and the file→DB migration script           |
| `migrations/` | Drizzle metadata (the schema is applied with `drizzle-kit push`)       |
| `data/`, `storage/` | Runtime data (file-storage mode, uploaded files, `server-id`)    |

### Data model

- **users** — username, bcrypt password hash, role (`admin` / `PM` / `TECH`; self-registration creates `PM`), optional e-mail.
- **projects** — owner, name, and the whole plan as one `jsonb` column `state`: layers, objects (with status, photos, comments, change requests…), cable routes, settings (`lvSettings`: cable defaults, technician permissions…), scale calibration, file ids of the PDFs, `revision` (bumped by every save / op) and `importedPeople` (people from an import who have no account here).
- **project_shares** — which users a project is shared with.
- **files** — metadata of uploaded files (plan PDF, overlay PDF, photos, images); the binary lives on disk under `storage/projects/<projectId>/` (or `storage/users/<userId>/…` for files without a project).
- **icon_library** — the team-wide icon library ("My Icons"): name, file, sha256 hash (the same image is stored once).
- **session** — session store for `connect-pg-simple`.

The schema is in `shared/schema.ts`. Docker applies it on every container start (`drizzle-kit push --force`, see `Dockerfile`); locally run `npm run db:push` after pulling schema changes. `--force` accepts destructive changes without asking, so back up (Admin → Export all projects, plus a `pg_dump`) before renaming or removing tables / columns.

`storage/server-id` identifies the installation (import uses it to tell "this server" from "another server"); keep `storage/` on a persistent volume.

### How it works

1. **Opening a plan.** The user uploads a PDF. It is rendered with `react-pdf` (pdf.js); objects are drawn on top in page-independent coordinates (`core/pdf-math.ts` handles scale and page rotation).
2. **Editing.** All editor state lives in a React reducer (`lib/editor-context.tsx`), split into the saved document (`DocumentState`) and screen-only state (`UIState`: zoom, tool, selection, measuring tape / path measure, a technician's own label positions…). Undo / redo keeps 100 steps (`lib/history.ts`).
3. **Saving (PM / admin).** The first save creates the project and uploads the PDF(s) to `/api/files`. After that `useAutoSave` sends the plan to `PUT /api/projects/:id?base=<revision>` about 2 s after the last change, with retries for flaky connections. If someone else saved in between, the server answers `409` with its plan; the client merges field by field (`lib/merge-state.ts`) and saves again, so nobody's changes are overwritten.
4. **Field work (technicians; comments, photos and request decisions for everyone).** Technicians never save the whole plan: each action is a small *op* sent to `POST /api/projects/:id/ops`, checked and applied by the server (`shared/tech-ops.ts`): status (with issue text), label position, photos, comments, change requests (move / label / cables / IDF) and, where the project allows it, direct edits. Comments, photos and requests are *server-owned*: a PM's full save keeps the stored ones.
5. **Live updates.** Every save / op bumps the project's revision and is announced over Server-Sent Events (`/api/projects/:id/events`); open plans fetch `/live` and merge it (PM) or take it over (technician). A 30 s poll covers lost connections.
6. **Access control.** Routes are guarded by `requireAuth` and, where needed, `requireRole(...)`. A project is visible to its owner, the users it is shared with, and every admin; rename, delete and share are owner-only. What technicians may change is a per-project setting enforced by the server (see *Technician permissions*).
7. **Serving.** In production Express serves the built SPA from `dist/public`; in development it mounts Vite as middleware.

### API overview

| Method & path | Role | Purpose |
|---|---|---|
| `POST /api/auth/register` | public | Create account (role `PM`) |
| `POST /api/auth/login` · `POST /api/auth/logout` | public / any | Session login / logout |
| `GET /api/auth/me` | any | Current user |
| `GET /api/projects` | any | Own and shared projects (admin: all) |
| `POST /api/projects` | PM, admin | Create project |
| `GET /api/projects/:id` | any* | Project state |
| `PUT /api/projects/:id?base=<rev>` | PM, admin* | Save the plan (`409` + current plan when `base` is out of date) |
| `PATCH /api/projects/:id` · `DELETE /api/projects/:id` | owner (PM, admin) | Rename · delete the project and its files |
| `POST /api/projects/:id/share` | owner (PM, admin) | Share with a user |
| `POST /api/projects/:id/ops` | any* | Field operations (see *How it works*, 4) |
| `GET /api/projects/:id/events` · `GET /api/projects/:id/live?rev=` | any* | Live updates (SSE) · the state, when the revision moved on |
| `GET /api/projects/:id/export` | any* | Project ZIP |
| `POST /api/projects/import` | PM, admin | Import a project ZIP (form field `people`: who is who) |
| `GET /api/projects/:id/people` · `POST …/people/:personId/link` | PM, admin* | Imported people without an account · link one to an account |
| `GET /api/server-info` | any | This installation's id |
| `GET /api/users/directory` | PM, admin | Accounts to pick from (name, role) |
| `POST /api/files` · `GET /api/files/:id` | any* | Upload (technicians: photos only) · download a file |
| `GET /api/icons` · `GET /api/icons/:id/file` | any | Icon library |
| `POST /api/icons` · `DELETE /api/icons/:id` | PM, admin | Add / remove library icons |
| `GET/POST /api/admin/users` · `PUT …/:id/role` · `PUT …/:id/password` | admin | User management |
| `GET /api/admin/backup` · `POST /api/admin/backup` | admin | Export · import all projects |

\* subject to project access checks.

Files are served with `X-Content-Type-Options: nosniff`; SVG images additionally with a sandboxing `Content-Security-Policy`.

---

## Features

### Plan editing
- Load a PDF plan and an optional **overlay PDF** (e.g. another installation's drawing) with adjustable opacity and position; **replace the blueprint PDF** with a new revision while objects stay in place.
- **Layers**: create, rename, hide, lock, reorder, set opacity.
- **Objects**: text, images, low-voltage device icons (floor box, data, TV, AV bar, face panel / access control, speakers, microphone, WAP, CCTV and 360° cameras, scheduler, control panel, copier / printer, rack / IDF), shapes, the team **icon library**, freehand drawing, paint-bucket fills.
- Move, resize, rotate, multi-select (drag a selection area), copy / paste (`Ctrl+C` / `Ctrl+V`), duplicate with the next label number, snapping and guides, undo / redo.
- **Auto-numbering**: prefix + counter (e.g. `IDF1-P1-001`) with click-to-place stamping.
- **Measuring**: set the scale once with the probe (saved with the project), then use the **measuring tape** (one distance) or the **path measure** (see below); mount heights per device.
- Zoom up to 1000%, pan, touch layout for tablets (bigger buttons, gestures, stylus-only mode).
- **Path measure** (every role, also on the phone; on a computer in the measuring tape's menu ▾, for technicians and on the phone its own button): click / tap point after point; each segment and the total length are shown (needs the plan's scale). On a phone a tap adds the next point, a drag still pans, and holding a finger on the plan removes the measurement; on a computer Backspace takes back a point and Esc / ✕ removes it. The measurement is only on your screen, never saved.

### Network documentation
- Per-object metadata: socket ID, patch-panel port, switch ID, cable ID, **cables** (type × count, with defaults per device type), the **IDF** a device home-runs to, mount height, notes and threaded comments. The device type is the icon itself.
- **Cable routes** per IDF and estimated / routed cable runs; **cable summary** (drops, patch panels, lengths per rack, boxes of cable).
- **CCTV**: camera field of view, blindspot walls, coverage areas and automatic camera placement.
- **Plan changes** (to be relocated / removed, added in a revision, on hold), tracked apart from the install status.
- Object names shown as labels on the plan (position per object; a technician can drag labels on their own screen only).

### Installation progress
- Status life cycle: `Planned → Cable Pulled → Terminated → Tested → Done`, plus `Issue` with a description (on the phone, Issue asks for the comment in a popup).
- Each status change records who made it and when.
- **Technician permissions** (main menu → *Technician permissions…*, PM / admin, per project): for location, label, cables and IDF, choose *Not allowed*, *Change request* (default: a PM or admin approves or rejects it) or *Without approval* (saved straight into the plan; the PM sees who changed it). The server enforces the setting. On the phone a technician long-presses an object to edit its label and cables.
- **Change requests**: a technician's move / label / cables / IDF change waits for a PM or admin (*Requests* button: approve or reject one by one or all at once, with a reason that goes back to the technician).
- **Color by status** turns the plan into a progress map; a dashboard shows completion percentage and issue count.
- **Photos** per object (compressed in the browser before upload) with a gallery view.

### Phone
- A simplified layout: the plan, a bottom bar for the selected object (status, planned cables, photos, move), and a ☰ menu (all projects, whole-layer visibility, colour by status, log out).
- Technicians start with colour by status on and camera coverage / cable routes off.
- **Install as an app** (*Install app* on the login page, the project list, the ☰ menu and the desktop main menu): an icon on the home screen that opens the app full screen. Android Chrome shows its install dialog; on iPhone / iPad the app shows the steps (Safari → Share → *Add to Home Screen*). Android installing needs the server on **HTTPS** (or `localhost`); iPhone home-screen icons work on plain HTTP too. Plans still need the connection: offline, the app shows a "You are offline" page.

### Users and projects
- Roles:
  - **admin** — everything, on every project (all projects are listed for admins), plus user management (create accounts, roles, password resets) and whole-server backup on the Admin page.
  - **PM** — create, edit, rename, delete and share projects; on their own and shared projects they approve or reject technicians' change requests and set the technician permissions.
  - **TECH** — works on projects shared with them in a simplified UI: status, issues, photos, comments, label positions, path measure, and changes to location / label / cables / IDF as the project allows (request or direct). Technicians never save the whole plan; everything goes through checked ops.
- Project list with rename, delete, sharing and per-project ZIP download.

### Import and export
- **Export Project Files (.zip)** (main menu, or the download button on a project in the list) — exported by the server, complete and portable: the plan with every layer / object / property, the PDF and overlay, photos and images as files, the icon library and the project name. People appear only as usernames: no accounts, passwords or e-mails.
- **Import from ZIP** — the server creates a new project (a copy, if the project already exists here) owned by the importer and stores its files; it is all or nothing (a failed import leaves nothing behind), and only PDFs and images keep their file type (anything else is stored as plain bytes). From **this** server (same server id) people and access stay as they were. From **another** server a *Who is who?* dialog asks, for each person in the ZIP, which account here they are (same-name accounts are suggested, never applied silently) and whether to share the project with them. Accounts are never created. People left without an account stay in the plan and are listed in the project's **Share** dialog, where they can be linked to an account (and given access) later. Older in-browser ZIPs (`project.json` + `document.pdf`, inlined photos) are imported too. `.json` files and unpacked folders still open in the browser as a new, unsaved project.
- **Admin: Export / Import all projects** — the same format for the whole server (re-importing skips projects that exist). Works on any server, also a fresh install with its own admin: one full import, or each project ZIP, brings back every project.
- **Flatten & download PDF** — draws all objects and labels into the PDF (white label backgrounds, configurable label font size, optional crop and cable summary page) for printing or sharing.

---

## Tech stack

- **Frontend:** React 19, Vite 7, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), TanStack Query, wouter, react-pdf, react-rnd
- **PDF processing:** pdf-lib (export), pdf.js via react-pdf (rendering), JSZip
- **Backend:** Node.js 20, Express 4, Passport (local), express-session, multer, Server-Sent Events
- **Database:** PostgreSQL 16, Drizzle ORM / drizzle-kit
- **Deployment:** multi-stage Dockerfile, Docker Compose

Vite 7 needs Node.js **20.19+** (or 22.12+) to build; with older Node 20 releases `vite build` fails with `crypto.hash is not a function`.

## Documentation

| File | Contents |
|---|---|
| `README.md` | This overview: running, architecture, API, features |
| `DEVELOPER.md` | Developer guide: code map, state and sync model, field ops, how to add things, conventions |

The other Markdown files in the root (`APPLICATION_TECHNICAL_INFO.md`, `DOCUMENTATION.md`, `DEV_README.md`, `architecture.md`, `database_implementation.md`, `jira*.md`, …) are design notes and reports from earlier stages, kept for history. Where they differ from the code, `README.md` and `DEVELOPER.md` are current.
