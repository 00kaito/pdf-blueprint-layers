# Task 4: Optimization and Performance Tuning

## Description
Apply performance optimizations to the new database-driven system, including upload streaming and auto-save throttling.

## Implementation Details

### 1. Multer DiskStorage Migration (`server/routes.ts`)
Switch from `memoryStorage` to `diskStorage` for file uploads:
- Configure `multer` to stream files directly to a temporary directory or the final storage path.
- This prevents large PDF files from being loaded entirely into RAM.

### 2. Auto-Save Throttling (`client/src/hooks/useAutoSave.ts`)
Adjust the auto-save behavior for the database environment:
- Increase debounce time from 1000ms to 2000-3000ms.
- Ensure the "dirty flag" logic correctly prevents unnecessary writes if the state hasn't changed.

### 3. Cleanup and Final Validation
- Remove any unused dependencies related to the old file-based storage (e.g., `memorystore` if no longer needed).
- Conduct a final load test with multiple simultaneous sessions to ensure PostgreSQL handles concurrent auto-saves gracefully.
- Verify that project sharing works correctly across accounts using the `project_shares` table.

## Acceptance Criteria
- [ ] File uploads use `diskStorage` and do not cause RAM spikes.
- [ ] Auto-save debounce is increased to 2-3 seconds.
- [ ] Multiple users can edit projects concurrently without data loss or performance degradation.
- [ ] Final project structure is clean and adheres to the new architecture.
