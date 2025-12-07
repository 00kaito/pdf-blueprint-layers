# PDF Editor Application - Developer Guide

## Project Overview

This is a client-side React application for editing PDF documents. It allows users to upload PDFs, add layers, and annotate them with text, images, icons, and drawings. The application focuses on frontend interactions and uses local state management.

## Core Architecture

The application is built using **React** with **Vite**.

### State Management ("The Heart")
The core logic resides in:
- **`client/src/lib/editor-context.tsx`**: This file contains the global state management for the editor.
  - It uses `React.useReducer` and `React.createContext` to manage the entire application state.
  - **`EditorState`**: Defines the data structure (layers, objects, current tool, zoom level, etc.).
  - **`editorReducer`**: Handles all actions like adding objects, moving layers, changing tools, etc.

### Key Components

The UI is divided into three main sections, all located in `client/src/components/editor/`:

1.  **`Toolbar.tsx`** (Top Bar)
    - Contains tools for adding text, images, icons, and drawing.
    - Manages zoom controls and file operations (export PDF, save project).
    - Handles property editing for selected objects (color, font size, etc.).

2.  **`LayerPanel.tsx`** (Left Sidebar)
    - Manages the layer hierarchy.
    - Allows reordering, locking, hiding/showing, and renaming layers.
    - Shows a list of objects within each layer for easy selection.

3.  **`Canvas.tsx`** (Main Workspace)
    - Renders the PDF using `react-pdf`.
    - Renders all user-added objects (text, images, SVG paths) on top of the PDF.
    - Uses `react-rnd` for drag-and-drop and resizing functionality.
    - Handles mouse events for drawing and selection.

4.  **`PDFUploader.tsx`** (Welcome Screen)
    - The initial screen for uploading a PDF or loading a JSON project.

### Data Types

- **`client/src/lib/types.ts`**: Defines the TypeScript interfaces for `Layer`, `EditorObject`, `EditorState`, and `EditorAction`. This is the contract for data structures used throughout the app.

## Key Features & Implementation Details

- **PDF Rendering**: Uses `react-pdf` to render PDF pages into a canvas.
- **Object Manipulation**: `react-rnd` provides the draggable/resizable wrappers for objects.
- **Drawing**: Implemented using SVG paths. The `Canvas` component tracks mouse movement to generate path data string (`d` attribute).
- **PDF Export**: Uses `pdf-lib` to generate a new PDF file. It takes the original PDF, embeds it, and draws the user's annotations (text, images, shapes) onto the PDF pages using vector graphics commands.

## Directory Structure

```
client/src/
├── components/
│   ├── editor/       # Core editor components (Canvas, Toolbar, LayerPanel)
│   └── ui/           # Reusable UI components (Buttons, Dialogs, etc.)
├── lib/
│   ├── editor-context.tsx  # Global State (Context + Reducer)
│   ├── types.ts            # Type definitions
│   └── utils.ts            # Helper functions
└── pages/
    └── home.tsx      # Main entry point for the editor route
```
