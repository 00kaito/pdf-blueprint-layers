# Task 2: Implementing DatabaseStorage and Postgres Session Store

## Description
This task involves creating the `DatabaseStorage` class using Drizzle ORM to replace the current file-based storage and migrating the session store to PostgreSQL.

## Implementation Details

### 1. DatabaseStorage Implementation (`server/databaseStorage.ts`)
Create a new class that implements the `IStorage` interface:
- Use `db` (Drizzle client) for all operations.
- **Projects**: Store `state` as JSONB within the `projects` table.
- **Sharing**: Use `project_shares` table instead of an array in the projects table.
- **Files**: Manage file metadata in the `files` table.
- **Transactions**: Implement project creation (Project + initial state) within a Drizzle transaction.

### 2. Session Store Migration (`server/auth.ts`)
Replace the in-memory session store with a PostgreSQL-backed store:
- Install `connect-pg-simple`.
- Configure `express-session` to use `connect-pg-simple` with the existing `DATABASE_URL`.
- Ensure sessions persist across server restarts.

### 3. Storage Switching (`server/storage.ts`)
Update `server/storage.ts` to export an instance of `DatabaseStorage` instead of `FileStorage`. This should be toggleable via an environment variable (e.g., `STORAGE_TYPE=database`) to allow for side-by-side testing if needed.

## Acceptance Criteria
- [ ] `DatabaseStorage` implements all methods from `IStorage`.
- [ ] Sessions are stored in the `session` table in PostgreSQL.
- [ ] Logging out and logging in works correctly with the new store.
- [ ] Server restarts do not log out users.
- [ ] Projects created via `DatabaseStorage` are visible in the database.
