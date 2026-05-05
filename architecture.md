# Project Architecture: PDF Blueprint Layers

## Overview
PDF Blueprint Layers is a specialized web application designed for "Network Passportization". It enables users to annotate PDF blueprints with multiple layers of interactive objects (icons, text, images, paths). The system is built for high-precision coordinate tracking, enabling technical teams to map infrastructure with physical accuracy on digital documents.

## State Management: Split Context Pattern
To ensure high performance and prevent unnecessary re-renders in a complex interactive environment, the application employs a **Split Context** pattern.

### 1. DocumentContext (`DocumentState`)
*   **Purpose**: Manages persistent, slow-changing project data.
*   **Data**: Layers, objects (annotations), custom icons, project settings, and auto-numbering configurations.
*   **Persistence**: Synced with the PostgreSQL backend via Drizzle ORM.
*   **Usage**: Components like `LayerPanel`, `PropertiesPanel`, and `Toolbar` consume this context to modify the underlying project data.

### 2. UIContext (`UIState`)
*   **Purpose**: Manages transient, fast-changing interface state.
*   **Data**: Zoom level, scroll position, active tool, currently selected object ID, and hover states.
*   **Performance**: High-frequency updates (e.g., during scrolling or dragging) only trigger re-renders in UI-dependent components (like `Canvas` or `ObjectRenderer`), leaving the heavy document tree untouched.
*   **Usage**: Consumed primarily by the `Canvas` and interactive overlays.

## Coordinate Transformation Logic
The application bridges the gap between screen-space interaction and physical PDF coordinates using a multi-step transformation pipeline.

### Virtual Coordinate System
*   **Base Width**: All coordinates are internally stored relative to a `CANVAS_BASE_WIDTH` of 2000px.
*   **Scaling**: This ensures that annotations remain proportionally correct regardless of the user's screen resolution or the PDF's native page size.

### Mapping Pipeline: Screen to PDF
1.  **Screen to Virtual**: UI interaction coordinates (Top-Left 0,0) are scaled to the 2000px virtual grid.
2.  **Rotation Handling**: The `pdf-math.ts` engine accounts for PDF page rotation (0°, 90°, 180°, 270°).
3.  **Virtual to Physical**: Visual coordinates (Top-Left 0,0) are mapped to PDF Physical coordinates (Bottom-Left 0,0). For a 0° rotation, physical `y = PageHeight - VisualY`.

## Logic Flows

### Object Creation
1.  **Trigger**: User selects a tool (e.g., "Add Icon") and clicks on the Canvas.
2.  **Calculation**: `useObjectCreation` hook calculates the virtual coordinates based on the click position and current scroll/zoom.
3.  **Dispatch**: A `ADD_OBJECT` action is sent to `DocumentContext`.
4.  **Auto-Save**: The `useAutoSave` hook detects the change and debounces a PUT request to the `/api/projects/:id` endpoint.

### Project Export (PDF & ZIP)
1.  **Retrieval**: `useExport` hook fetches the latest `DocumentState`.
2.  **PDF Flattening**:
    *   Loads the original PDF via `pdf-lib`.
    *   Iterates through objects, sorting them by layer order.
    *   Converts virtual coordinates to physical coordinates using `pdf-math.ts`.
    *   Draws vector shapes (paths, icons) and text directly onto the PDF graphics stream.
    *   Downloads the resulting "flattened" PDF.
3.  **Project Bundle**:
    *   Creates a `JSZip` instance.
    *   Includes the `project.json` (full state) and all associated assets (original PDF, images).
    *   Ensures all blob/relative URLs are converted to embedded data for portability.
