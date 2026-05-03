orch # Task 3: Data Migration Script and File Restructuring

## Description
Develop and execute a one-time migration script to move existing users, projects, and files from JSON/Local storage into PostgreSQL and the new directory structure.

## Implementation Details

### 1. Migration Script (`script/migrate_to_db.ts`)
Create a script that performs the following:
- **Read JSON Files**: Load `data/users.json` and `data/projects.json`.
- **Migrate Users**: Insert users into the `users` table.
- **Migrate Projects**: 
  - For each project, read its state from `data/project-states/{id}.json`.
  - Insert into the `projects` table (merging project metadata and state).
  - Decompose the `sharedWith` array and insert into the `project_shares` table.
- **Migrate File Metadata**: Read all `*.meta.json` files from `data/files/` and insert into the `files` table.

### 2. File System Restructuring
Move physical files from `data/files/` to a new organized structure:
- **Project Files**: `/storage/projects/{project_id}/{file_id}` (Blueprints, photos).
- **User Icons**: `/storage/users/{user_id}/icons/{file_id}` (Custom icons).
- Update the `storagePath` column in the `files` table accordingly.

### 3. Validation
- Log the number of users, projects, and files migrated.
- Verify that the counts match the source data.
- Check a few sample projects to ensure state integrity.

## Acceptance Criteria
- [ ] All data from JSON files is successfully moved to PostgreSQL.
- [ ] Physical files are moved to the new `/storage/` directory structure.
- [ ] Migration logs show no errors and correct record counts.
- [ ] The `data/` directory can be safely archived/removed after successful validation.
