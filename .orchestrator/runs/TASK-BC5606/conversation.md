# Conversation Log — TASK-BC5606

**Task:** wdrozenia bazy relacyjnej #3 w projekcie - wykonaj zadanie umieszczone w pliku jira3.md

**Roles:** architect=Claude, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-02 22:05:08

### Claude (Architekt)

**Summary:** Create a one-time migration script (`script/migrate_to_db.ts`) that reads JSON/filesystem data from `data/`, inserts it into PostgreSQL via drizzle-orm, and moves physical files to a new `/storage/` directory structure. Also update `DatabaseStorage.saveFile()` to persist new uploads to the same organized paths.

**Plan:**
1. **Create migration script** — Create `script/migrate_to_db.ts` as an ESM TypeScript script runnable via `tsx`. The script must: (1) load `.env` via inline synchronous fs.readFileSync before any DB import, then dynamically import `../server/db.ts` and `../shared/schema.ts` to avoid the DATABASE_URL guard throwing on static import hoisting; (2) insert all users from `data/users.json` into the `users` table using `db.insert(users).values(...).onConflictDoNothing()` to be idempotent, preserving original UUIDs, username, passwordHash, and createdAt; (3) for each project in `data/projects.json`, read its state file at `data/project-states/{id}.json`, then `db.insert(projects).values({ id, ownerId, name, state, createdAt, updatedAt }).onConflictDoNothing()`, then batch-insert `projectShares` rows for each entry in `sharedWith`; (4) glob all `data/files/*.meta.json` files and for each: read the meta JSON, stat the physical file at `data/files/{id}` for its `size`, compute the new `storagePath` as `storage/projects/{projectId}/{id}` when `projectId` is present or `storage/users/{ownerId}/icons/{id}` otherwise, `fs.mkdirSync` the target directory, `fs.copyFileSync` the physical file to the new path, then `db.insert(files).values({ id, ownerId, projectId, originalName, mimeType, storagePath, size, createdAt }).onConflictDoNothing()`; (5) print a validation summary: count of users/projects/shares/files inserted vs source counts, and call `pool.end()` to close DB connection. `[CREATE]`
2. **Update DatabaseStorage file path logic** — In `server/databaseStorage.ts`, replace the hardcoded `filesDir = path.resolve(cwd, 'data', 'files')` with a `storageRoot = path.resolve(cwd, 'storage')`. In `saveFile()`, compute the target directory dynamically: when `projectId` is provided use `path.join(storageRoot, 'projects', projectId)`, otherwise use `path.join(storageRoot, 'users', ownerId, 'icons')`. Call `fs.mkdirSync(targetDir, { recursive: true })` before writing. Set `storagePath = path.join(targetDir, id)`. Remove the blanket mkdir in the constructor since directories are now created per-upload. In `getFileBuffer()` and `deleteFile()`, the `storagePath` is already the absolute path from DB, so no path joins are needed — leave those methods as-is. `[MODIFY]`
3. **Add db:migrate npm script** — In `package.json`, add `"db:migrate": "tsx script/migrate_to_db.ts"` to the `scripts` section. The script's inline .env loader means no special NODE flags are required beyond `tsx`. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` File `script/migrate_to_db.ts` exists and contains a top-level `await` ESM script with dynamic imports for `../server/db.ts` after loading `.env` synchronously.  
  *Verify:* Read `script/migrate_to_db.ts` — confirm `fs.readFileSync('.env')` appears before any `await import('../server/db')`.
- `[c2]` Migration script inserts users with `onConflictDoNothing()` using original UUIDs from `data/users.json`, preserving `passwordHash` and `createdAt`.  
  *Verify:* Search `script/migrate_to_db.ts` for `onConflictDoNothing` and verify `users` insert maps `id`, `username`, `passwordHash`, `createdAt` fields directly.
- `[c3]` Migration script reads `data/project-states/{id}.json` for each project and includes it as the `state` field in the `projects` insert.  
  *Verify:* In `script/migrate_to_db.ts`, find the projects loop — confirm `readFileSync(path.join(statesDir, project.id + '.json'))` is called and its parsed result is passed as `state` to `db.insert(projects)`.
- `[c4]` Migration script inserts rows into `project_shares` for every element in the `sharedWith` array of each project.  
  *Verify:* In `script/migrate_to_db.ts`, find `db.insert(projectShares)` call — it must map `sharedWith` array to `{ projectId, userId }` objects.
- `[c5]` Files with a `projectId` in meta.json are assigned `storagePath` of `storage/projects/{projectId}/{fileId}`; files without `projectId` get `storage/users/{ownerId}/icons/{fileId}`.  
  *Verify:* Read `script/migrate_to_db.ts` — confirm the conditional path logic: `meta.projectId ? path.join(storageRoot, 'projects', meta.projectId, meta.id) : path.join(storageRoot, 'users', meta.ownerId, 'icons', meta.id)`.
- `[c6]` `DatabaseStorage.saveFile()` computes target directory based on `projectId` presence: `storage/projects/{projectId}/{id}` or `storage/users/{ownerId}/icons/{id}`.  
  *Verify:* Read `server/databaseStorage.ts` lines for `saveFile()` — confirm `projectId ? path.join(storageRoot, 'projects', projectId) : path.join(storageRoot, 'users', ownerId, 'icons')` and `fs.mkdirSync(dir, { recursive: true })`.
- `[c7]` Script prints a validation summary with counts of users, projects, project_shares, and files inserted vs. source record counts.  
  *Verify:* Read `script/migrate_to_db.ts` — confirm `console.log` calls report both the number of source records read and the result of `db.select({ count: count() })` from each table.
- `[c8]` `package.json` contains a `db:migrate` script entry that runs the migration via `tsx`.  
  *Verify:* Read `package.json` `scripts` section — confirm `"db:migrate": "tsx script/migrate_to_db.ts"` is present.

**Risks:**
- The `data/files/*.meta.json` format does not include `size`; the script must stat the physical binary file to get it — if a physical file is missing for a given meta.json, the migration will fail for that record unless guarded with a try-catch that skips or logs the orphaned meta.
- Static import hoisting in ESM means `../server/db.ts` will throw before .env is loaded if not used via dynamic import — the plan explicitly requires dynamic import, but this is an unusual pattern that reviewers may question.
- The migration is idempotent via `onConflictDoNothing()`, but `project_shares` uses a composite primary key (projectId, userId) — a partial re-run after inserting some shares but not others will skip already-inserted rows correctly, but only if the conflict check covers the composite PK.
- After migration, the old `data/files/{id}` files still exist (the script copies, not moves). A separate cleanup step is needed to safely delete originals after validation; the script should log this reminder.

---

