# Conversation Log — TASK-0795A8

**Task:** Przeanalizuj aplikacje pod katem architektury - w szczegolnosci pliki architecture.md, DEV_README.md oraz readme.md i wprowadz usprawnienia optymalizacyjne kodu, ktore poprawia dzialanie aplikacji jednak skup sie na askeptach krytycznych, nie szukaj optymalizacji ktore wymagaja duzo nakladow pracy a w efekcie nie zmienia wiele

**Roles:** architect=Gemini, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-06 06:44:50

### Gemini (Architekt)

**Summary:** Optimizing application performance and architecture by splitting React contexts to prevent unnecessary re-renders and decomposing the massive Toolbar component into manageable sub-components.

**Plan:**
1. **Context Splitting Implementation** — Split DocumentContext and UIContext into separate State and Dispatch contexts in editor-context.tsx. This ensures that components only needing dispatch (like ObjectRenderer) don't re-render on every state change. `[MODIFY]`
2. **Component Performance Optimization** — Memoize ObjectRenderer and DrawingLayer using React.memo. Update them to consume granular dispatch hooks and pass only necessary state props to minimize re-render cycles during high-frequency UI updates. `[MODIFY]`
3. **Toolbar Decomposition** — Refactor Toolbar.tsx by extracting ObjectPropertyEditor, ZoomControls, and ProjectActions into separate sub-components to reduce file size and improve re-render boundaries. `[MODIFY]`
4. **Codebase Cleanup and Constants Alignment** — Replace hardcoded width in OverlayDocument.tsx with CANVAS_BASE_WIDTH, remove deprecated useEditor hook, and move magic strings/numbers from hooks and components to core/constants.ts. `[MODIFY]`
5. **Asset and Logic Polish** — Implement proper SVG path for the heart icon in icon-shapes.ts and ensure all core logic uses centralized constants. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` DocumentDispatchContext and UIDispatchContext are defined and exported in editor-context.tsx  
  *Verify:* Check client/src/lib/editor-context.tsx for these context definitions.
- `[c2]` ObjectRenderer is wrapped in React.memo and uses useDocumentDispatch/useUIDispatch hooks  
  *Verify:* Examine client/src/components/editor/Canvas/ObjectRenderer.tsx for React.memo usage.
- `[c3]` OverlayDocument uses CANVAS_BASE_WIDTH instead of hardcoded 600  
  *Verify:* Check line 18 of client/src/components/editor/Canvas/OverlayDocument.tsx.
- `[c4]` useEditor hook is removed from the codebase  
  *Verify:* Grep for useEditor in client/src/lib/editor-context.tsx.
- `[c5]` Toolbar.tsx file size is reduced by at least 30% by moving logic to sub-components  
  *Verify:* Compare line count of Toolbar.tsx before and after refactoring.
- `[c6]` Heart icon in icon-shapes.ts has a unique SVG path, distinct from diamond  
  *Verify:* Check the 'heart' entry in the shapes record in client/src/core/icon-shapes.ts.
- `[c7]` All existing tests or type checks (npm run check) pass  
  *Verify:* Execute 'npm run check' in the terminal.

**Risks:**
- Context splitting might break components that rely on the combined state/dispatch object if not handled with proper backward-compatible hooks.
- Memoization might cause stale closures if dependencies are not correctly tracked in hooks or memo comparison functions.

---

