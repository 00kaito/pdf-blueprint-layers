# Task 1: Environment and Core Schema Definition

## Description
The goal of this task is to set up the foundational database environment and define the relational schema using Drizzle ORM based on the improved architecture in `database_implementation.md`.

## Implementation Details

### 1. Environment Configuration
- Ensure `DATABASE_URL` is correctly set in the `.env` file (PostgreSQL connection string).
- Verify connection using a simple script or `psql`.

### 2. Schema Definition (`shared/schema.ts`)
Update `shared/schema.ts` to include Drizzle table definitions:

- **`users` table**:
  - `id`: uuid (primary key)
  - `username`: text (unique, not null)
  - `email`: text (unique, nullable)
  - `passwordHash`: text (not null)
  - `createdAt`: timestamp (default now)

- **`projects` table**:
  - `id`: uuid (primary key)
  - `ownerId`: uuid (references `users.id`)
  - `name`: text (not null)
  - `state`: jsonb (not null, defaults to initial state structure)
  - `createdAt`: timestamp (default now)
  - `updatedAt`: timestamp (default now)

- **`project_shares` table**:
  - `projectId`: uuid (references `projects.id`)
  - `userId`: uuid (references `users.id`)
  - Primary Key: `(projectId, userId)`

- **`files` table**:
  - `id`: uuid (primary key)
  - `ownerId`: uuid (references `users.id`)
  - `projectId`: uuid (references `projects.id`, nullable)
  - `originalName`: text (not null)
  - `mimeType`: text (not null)
  - `size`: integer (not null)
  - `storagePath`: text (not null)
  - `createdAt`: timestamp (default now)

### 3. Database Indexes
Add indices for frequently queried foreign keys:
- `projects(ownerId)`
- `project_shares(userId)`
- `project_shares(projectId)`
- `files(projectId)`
- `files(ownerId)`

### 4. Database Provisioning
- Run `npx drizzle-kit push` to synchronize the schema with the PostgreSQL database.

## Acceptance Criteria
- [ ] `DATABASE_URL` is functional.
- [ ] `shared/schema.ts` contains all requested table and index definitions.
- [ ] Database tables are successfully created in PostgreSQL.
- [ ] Drizzle-zod schemas are exported for validation.
