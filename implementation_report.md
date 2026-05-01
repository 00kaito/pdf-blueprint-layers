# Implementation Report — Iteration 1

## Changes made
- **Installed dependencies**: Added `bcrypt`, `multer` and their type definitions to support password hashing and file uploads.
- **Refactored Schema**: Converted `shared/schema.ts` from Drizzle ORM to plain TypeScript interfaces and Zod schemas for file-based persistence.
- **Created Persistence Layer**: Implemented `server/fileStorage.ts` for managing users, projects, and binary files in a `data/` directory with atomic writes.
- **Updated Storage Singleton**: Switched `server/storage.ts` to use `FileStorage` instead of `MemStorage`.
- **Implemented Authentication**: Created `server/auth.ts` using `passport-local` and `express-session` with `memorystore` for session management.
- **Built API Routes**: Implemented auth (register/login/logout/me), projects (CRUD + sharing), and file (upload/serve) endpoints in `server/routes.ts`.
- **Updated Frontend State**: Added `projectId`, `pdfFileId`, and `overlayPdfFileId` to `DocumentState` in `client/src/lib/types.ts` and updated the reducer in `editor-context.tsx`.
- **Created Frontend Hooks**: Added `useAuth.ts` for session management and `useProjects.ts` for server-side project operations.
- **Built Auth UI**: Created `client/src/pages/AuthPage.tsx` with login/register forms and integrated it into `App.tsx` with an auth guard.
- **Revamped Project Loading**: Completely rewritten `PDFUploader.tsx` to show a server-side project list, support new project creation with file uploads, and project sharing.
- **Implemented Auto-save**: Created `useAutoSave.ts` hook with 2-second debounce and integrated it into `Home.tsx`, with a visual "Saving/Saved" indicator in `Toolbar.tsx`.

## Files affected
- CREATED: `server/fileStorage.ts`
- CREATED: `server/auth.ts`
- CREATED: `client/src/hooks/useAuth.ts`
- CREATED: `client/src/hooks/useProjects.ts`
- CREATED: `client/src/hooks/useAutoSave.ts`
- CREATED: `client/src/pages/AuthPage.tsx`
- MODIFIED: `package.json`
- MODIFIED: `shared/schema.ts`
- MODIFIED: `server/storage.ts`
- MODIFIED: `server/index.ts`
- MODIFIED: `server/routes.ts`
- MODIFIED: `client/src/lib/types.ts`
- MODIFIED: `client/src/lib/editor-context.tsx`
- MODIFIED: `client/src/App.tsx`
- MODIFIED: `client/src/components/editor/PDFUploader.tsx`
- MODIFIED: `client/src/pages/home.tsx`
- MODIFIED: `client/src/components/editor/Toolbar.tsx`

## Deviations from plan
- Included `passport` and `express-session` related packages in the initial installation step to ensure all auth dependencies are present.
- Used `any` for `timeoutRef` in `useAutoSave.ts` to avoid environment-specific type issues with `setTimeout`.
- Added a `log` function to `server/index.ts` to maintain consistency with existing logging patterns while adding auth middleware.

## Potential issues
- `express-session` uses `MemoryStore`, which means users will be logged out whenever the server restarts. This is acceptable for the current scale but should be moved to a persistent store if session longevity is critical.
- Very large projects (many high-res photos) might hit the 50MB limit or be slow to save/load due to the monolithic project state JSON. Moving photos to separate file uploads (similar to PDFs) would be the next logical optimization.
