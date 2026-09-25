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

On first start the container runs `drizzle-kit push` to create the schema, then seeds an admin account:

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

### Option B — Local development

Requires Node.js 20+.

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
┌─────────────────────────── Browser (React SPA) ───────────────────────────┐
│  pages/  AuthPage · home (editor + project list) · AdminPage              │
│  components/editor/  Canvas · Toolbar · LayerPanel · PropertiesPanel ...  │
│  lib/editor-context  ── useReducer store (DocumentState + UIState)        │
│  hooks/  useAutoSave · useManualSave · useExport · useImport · useProjects│
│  core/   pdf-math (coordinates/rotation) · icon-shapes · image-compress   │
└──────────────┬───────────────────────────────────────────────────────────┘
               │  REST /api/*  (session cookie, TanStack Query)
┌──────────────▼──────────── Express server (Node 20) ─────────────────────┐
│  auth.ts     Passport local strategy, bcrypt, sessions, role guards       │
│  routes.ts   auth · projects · sharing · files · admin endpoints          │
│  storage.ts  picks an IStorage implementation:                            │
│     ├─ DatabaseStorage  → PostgreSQL (Drizzle) + files on disk ./storage │
│     └─ FileStorage      → JSON files + uploads in ./data                 │
└──────────────────────────────────────────────────────────────────────────┘
```

### Repository layout

| Path        | Contents                                                                 |
|-------------|--------------------------------------------------------------------------|
| `client/`   | React 19 + Vite + Tailwind + shadcn/ui front end                         |
| `server/`   | Express API, authentication, storage implementations, static/Vite serving |
| `shared/`   | `schema.ts` — Drizzle tables and Zod validation shared by client and server |
| `script/`   | Build script (Vite + esbuild) and the file→DB migration script           |
| `migrations/` | Drizzle migration output                                               |
| `data/`, `storage/` | Runtime data (file-storage mode, uploaded files)                |

### Data model

- **users** — username, bcrypt password hash, role (`admin` / `PM` / `TECH`).
- **projects** — owner, name, and the whole editor state as a single `jsonb` column (`state`: layers, objects, custom icons, settings, references to PDF file ids).
- **project_shares** — which users a project is shared with.
- **files** — metadata of uploaded files (plan PDF, overlay PDF, photos, icons); the binary lives on disk under `storage/projects/<projectId>/` or `storage/users/<userId>/icons/`.
- **session** — session store for `connect-pg-simple`.

### How it works

1. **Opening a plan.** The user uploads a PDF. It is rendered with `react-pdf` (pdf.js); editor objects are drawn on top in an absolutely positioned layer and are stored in page-independent coordinates (`core/pdf-math.ts` handles scale and page rotation).
2. **Editing.** All editor state lives in a React reducer (`lib/editor-context.tsx`). Every change (add/move/resize object, layers, status, photos) is a reducer action.
3. **Saving.** On the first save a project is created on the server and the PDF(s) are uploaded to `/api/files`. After that, `useAutoSave` sends the state to `PUT /api/projects/:id` about 2 s after the last change, with retries for flaky mobile connections; there is also a manual save button.
4. **Loading.** The project list comes from `GET /api/projects` (own + shared projects); opening a project loads its state and streams the PDFs from `/api/files/:id`.
5. **Access control.** Each API route is guarded by `requireAuth` and, where needed, `requireRole(...)`. A project is visible only to its owner and the users it is shared with (this applies to admins too); rename, delete and share are owner-only.
6. **Serving.** In production Express serves the built SPA from `dist/public`; in development it mounts Vite as middleware.

### API overview

| Method & path                         | Role        | Purpose                        |
|---------------------------------------|-------------|--------------------------------|
| `POST /api/auth/register`             | public      | Create account (role `PM`)     |
| `POST /api/auth/login` / `logout`     | public/any  | Session login/logout           |
| `GET /api/auth/me`                    | any         | Current user                   |
| `GET /api/projects`                   | any         | Own and shared projects        |
| `POST /api/projects`                  | PM, admin   | Create project                 |
| `GET /api/projects/:id`               | any*        | Project state                  |
| `PUT /api/projects/:id`               | PM, admin   | Save project state             |
| `PATCH /api/projects/:id`             | PM, admin   | Rename project                 |
| `DELETE /api/projects/:id`            | PM, admin   | Delete project and its files   |
| `POST /api/projects/:id/share`        | PM, admin   | Share with users               |
| `POST /api/files` / `GET /api/files/:id` | PM, admin / any* | Upload / download a file |
| `GET /api/admin/users`, `PUT .../role`, `PUT .../password` | admin | User management |

\* subject to project access checks.

---

## Features

### Plan editing
- Load a PDF plan and an optional **overlay PDF** (e.g. another installation's drawing) with adjustable opacity.
- **Layers**: create, rename, hide, lock, reorder, set opacity.
- **Objects**: text, images, icons (square, circle, triangle, star, hexagon, arrow, camera, and user-uploaded **custom icons**), freehand drawing.
- Move, resize, rotate, multi-select, copy/paste (`Ctrl+C` / `Ctrl+V`) with smart offset.
- **Auto-numbering**: prefix + counter (e.g. `IDF1-P1-001`) with click-to-place stamping for fast placement of many points.
- Zoom up to 1000%, pan, and touch gestures (pinch zoom) on mobile.

### Network documentation
- Per-object metadata: socket ID, patch-panel port, switch ID, cable ID, purpose (`Data`, `Mic`, `CAM`, `TV`, `Other`), notes and comments.
- Object names shown as labels on the plan.

### Installation progress
- Status life cycle: `Planned → Cable Pulled → Terminated → Tested → Approved`, plus `Issue` with a description.
- Each status change records who made it and when.
- **Color by status** turns the plan into a progress map; a dashboard shows completion percentage and issue count.
- **Photos** per object (compressed in the browser before upload) with a gallery view.

### Users and projects
- Roles:
  - **admin** — everything, plus user management (roles, password resets) on the Admin page.
  - **PM** — create, edit, rename, delete and share projects.
  - **TECH** — opens projects shared with them in a simplified, preview-oriented UI (status and photos). Note: the API currently allows saving project state (`PUT /api/projects/:id`) only for PM/admin.
- Project list with rename, delete and sharing.

### Import and export
- **Export Project Files (.zip)** — `project.json` plus `document.pdf` / `overlay.pdf`, with images and photos embedded. The file is named after the project.
- **Import** a project from `.zip`, `.json`, or an unpacked project folder.
- **Flatten & download PDF** — draws all objects and labels into the PDF (white label backgrounds, configurable label font size in Settings) for printing or sharing.

---

## Tech stack

- **Frontend:** React 19, Vite 7, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), TanStack Query, wouter, react-pdf, react-rnd
- **PDF processing:** pdf-lib (export), pdf.js via react-pdf (rendering), JSZip
- **Backend:** Node.js 20, Express 4, Passport (local), express-session, multer
- **Database:** PostgreSQL 16, Drizzle ORM / drizzle-kit
- **Deployment:** multi-stage Dockerfile, Docker Compose

Further technical notes: `APPLICATION_TECHNICAL_INFO.md`, `DEVELOPER.md`, `database_implementation.md`.
