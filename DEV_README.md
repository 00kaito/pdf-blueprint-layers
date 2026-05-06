# Developer Guide: Project Structure & File Mapping

This guide provides a detailed overview of the core files in the `pdf-blueprint-layers` repository, their responsibilities, and how they communicate.

## Frontend (client/src)

### Core Logic & State
1.  **`lib/editor-context.tsx`**: Implementation of the **Split Context** pattern. Defines `DocumentContext` for data and `UIContext` for interface state. Contains the reducers for all project-wide actions.
2.  **`core/pdf-math.ts`**: The math engine for coordinate transformations. Handles mapping between visual screen coordinates and physical PDF coordinates, accounting for page rotation.
3.  **`hooks/useExport.ts`**: Orchestrates the export pipeline. Uses `pdf-lib` for flattening annotations into PDFs and `jszip` for project bundling.
4.  **`hooks/useObjectCreation.ts`**: Centralizes logic for adding new layers, icons, text, and images to the document.
5.  **`hooks/useAutoSave.ts`**: Monitors changes in `DocumentContext` and automatically syncs the state to the server with debouncing.
6.  **`hooks/useAuth.ts`**: Manages user session state, login/logout logic, and role-based access helpers.

### Components
7.  **`components/editor/Canvas/Canvas.tsx`**: The main viewport for PDF rendering and object interaction. Coordinates with `UIContext` for zoom/scroll and `DocumentContext` for rendering objects.
8.  **`components/editor/Toolbar.tsx`**: Provides the main application tools (select, draw, add text, etc.) and global actions (undo/redo, export, save).
9.  **`components/editor/LayerPanel.tsx`**: Interface for managing layers (visibility, opacity, locking, and ordering).
10. **`components/editor/PropertiesPanel.tsx`**: Contextual editor for the selected object's properties (color, size, text content, photos).
11. **`App.tsx`**: Main entry point that sets up the React Query client, Auth provider, and routing (Login, Home/Editor, Admin).

## Backend (server)

### API & Storage
12. **`config.ts`**: Centralized configuration management. Loads `.env` and exports a typed `config` object used across the server to handle environment-specific logic (e.g., storage type, database connectivity).
13. **`routes.ts`**: Defines all REST API endpoints. Manages the flow between HTTP requests and the storage layer for authentication, project CRUD, and file management.
14. **`databaseStorage.ts`**: The primary storage implementation using **Drizzle ORM** and **PostgreSQL**. Handles complex queries for shared projects and file metadata.
15. **`db.ts`**: Initializes the Drizzle database connection using the `postgres` driver.
16. **`auth.ts`**: Configures **Passport.js** with a local strategy for authentication and defines role-based middleware (`requireRole`).

### Shared
17. **`shared/schema.ts`**: Single source of truth for the database schema. Defines tables for `users`, `projects`, `project_shares`, and `files` using Drizzle, along with Zod schemas for validation.

## Communication Overview
*   **State Management**: Local component state is minimized; most logic flows through the `Document` and `UI` contexts via `dispatch`.
*   **API Interaction**: The frontend uses **TanStack Query** (React Query) to communicate with the Node.js backend.
*   **File Handling**: Large files (PDFs, images) are uploaded to the `/api/files` endpoint, stored on the filesystem, and tracked via PostgreSQL metadata.
*   **Security**: Routes are protected by session-based authentication. Role-based checks (Admin, PM, TECH) are enforced both on the frontend (UI visibility) and backend (route middleware).
