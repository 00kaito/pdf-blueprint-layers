# Conversation Log — TASK-C29392

**Task:** wdrozenia bazy relacyjnej #2 w projekcie - wykonaj zadanie umieszczone w pliku jira2.md

**Roles:** architect=Claude, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-02 21:56:07

### Claude (Architekt)

**Summary:** Create DatabaseStorage using Drizzle ORM to replace FileStorage, migrate the Express session store to PostgreSQL via connect-pg-simple, and add an environment-variable toggle in storage.ts so DatabaseStorage is the new default.

**Plan:**
1. **Create server/db.ts — Drizzle client + pg Pool** — Create a new file that initialises a pg.Pool from DATABASE_URL and passes it to drizzle(). Export both `pool` (reused by the session store) and `db` (used by DatabaseStorage). Guard against a missing DATABASE_URL with a clear startup error. `[CREATE]`
2. **Create server/databaseStorage.ts — DatabaseStorage class** — Implement the full IStorage interface using Drizzle queries against the schema from shared/schema.ts. Key design points:
- getProject / listProjectsForUser: LEFT JOIN project_shares and aggregate userId values into sharedWith: string[].
- getProjectState: SELECT state JSONB from projects.
- saveProjectState: UPDATE projects SET state = $state, updated_at = NOW().
- updateProject: if partial.sharedWith is present, DELETE all existing project_shares rows then INSERT the new set (sync pattern).
- deleteProject: delete project_shares rows first (FK constraint), then delete the project row.
- createProject: wrap the INSERT into a db.transaction() so the row is consistent from the start.
- saveFile / getFileBuffer / deleteFile: keep binary files on disk at data/files/{uuid} as FileStorage does; store path in files.storagePath; read/delete using that path.
- getFileMeta: SELECT from files table by id. `[CREATE]`
3. **Modify server/auth.ts — replace MemoryStore with PgStore** — Remove the memorystore import and MemoryStore instantiation. Import connectPgSimple from 'connect-pg-simple' and the pool from './db'. Create a PgStore with { pool, tableName: 'session', createTableIfMissing: true } and use it as the session store. The cookie/resave/saveUninitialized settings remain unchanged. `[MODIFY]`
4. **Modify server/storage.ts — switch default to DatabaseStorage** — Import DatabaseStorage from './databaseStorage'. Export storage as a DatabaseStorage instance by default. When env var STORAGE_TYPE=file is set, fall back to FileStorage. This preserves the ability to run against the file-based store during testing without a database. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` File server/db.ts exists and exports `pool` typed as pg.Pool and `db` typed as a Drizzle instance initialised with the schema from shared/schema.ts  
  *Verify:* Read server/db.ts and confirm both `export const pool` and `export const db` are present; `db` is created via drizzle(pool, { schema })
- `[c2]` DatabaseStorage in server/databaseStorage.ts implements every method declared in the IStorage interface: getUser, getUserByUsername, createUser, getProject, listProjectsForUser, createProject, updateProject, deleteProject, getProjectState, saveProjectState, saveFile, getFileMeta, getFileBuffer, deleteFile  
  *Verify:* Read server/databaseStorage.ts and confirm the class declaration includes all 14 method signatures matching IStorage; TypeScript `tsc --noEmit` must produce no errors
- `[c3]` DatabaseStorage.getProject and listProjectsForUser return Project objects with sharedWith populated from the project_shares table, not hardcoded as []  
  *Verify:* Read the implementations and confirm they query project_shares (via JOIN or separate SELECT) and aggregate userId values into the sharedWith array before returning
- `[c4]` DatabaseStorage.saveProjectState updates the state JSONB column in the projects table (not a file), and also updates updatedAt  
  *Verify:* Read saveProjectState in server/databaseStorage.ts; confirm it calls db.update(projects).set({ state, updatedAt: new Date().toISOString() }).where(eq(projects.id, id))
- `[c5]` DatabaseStorage.createProject wraps its INSERT inside a db.transaction() call  
  *Verify:* Read createProject in server/databaseStorage.ts and confirm the body uses db.transaction(async (tx) => { ... }) and all inserts use the tx parameter
- `[c6]` server/auth.ts no longer imports or references memorystore or MemoryStore; the session store is a connect-pg-simple instance constructed with the shared pg pool  
  *Verify:* Read server/auth.ts; confirm no import from 'memorystore', confirm `new PgStore({ pool, ... createTableIfMissing: true })` is present
- `[c7]` server/storage.ts exports DatabaseStorage as the default storage instance; when STORAGE_TYPE=file is set it exports FileStorage instead  
  *Verify:* Read server/storage.ts and confirm the conditional: process.env.STORAGE_TYPE === 'file' ? new FileStorage() : new DatabaseStorage()
- `[c8]` TypeScript compilation of the server passes without errors after the changes  
  *Verify:* Run `npx tsc --noEmit` from the project root; exit code must be 0

**Risks:**
- connect-pg-simple creates the 'session' table automatically only when createTableIfMissing:true is passed — omitting it causes a startup crash on a fresh database
- db.transaction() requires all Drizzle queries inside the callback to use the tx proxy, not the outer db — using db instead of tx silently bypasses the transaction
- Two separate pg connection pools (one in db.ts, one implicitly created by connect-pg-simple) would waste connections — must pass the shared pool to PgStore to avoid this
- DATABASE_URL may be absent in some environments; DatabaseStorage and db.ts should fail fast with a readable error rather than a cryptic pg connection error at first query
- @types/pg is not listed in devDependencies — if TypeScript cannot resolve Pool types from 'pg', add @types/pg to devDependencies
- deleteProject must delete project_shares rows before the project row due to the FK constraint — wrong order causes a foreign key violation error

---

