# Code Style and Conventions
- **State Management**: Use `useDocument()` for data-heavy state and `useUI()` for fast-changing interface state. Avoid `useEditor()` (deprecated).
- **Core Logic**: Keep complex math and transformations in `client/src/core/`.
- **Components**: Use Shadcn/UI for base components.
- **Coordinate System**: All internal coordinates are relative to `CANVAS_BASE_WIDTH`.
