# Conversation Log — TASK-249548

**Task:** jest problem z wydajnoscia gdy klikam upload na ekranie glownym - zanim pojawi sie okno wyboru plikow czesto przegladarka sie zamraza na kilka-kilkanascie sekund

**Roles:** architect=Claude, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-01 14:07:09

### Claude (Architekt)

**Summary:** The browser freezes because pdfjs-dist (~2MB) is parsed and executed synchronously on the main thread during initial page load — it's statically imported from home.tsx before the user can interact. The fix is to (1) lazy-load all 5 editor components so pdfjs-dist and pdf-lib land in a separate chunk loaded only after file selection, and (2) replace the unpkg.com CDN worker URL with a local Vite asset URL to eliminate the external network dependency.

**Plan:**
1. **Lazy-load editor components in home.tsx** — Remove the 5 static import statements for Canvas, Toolbar, ObjectToolbar, LayerPanel, and PropertiesPanel. Replace each with a React.lazy() dynamic import: e.g. `const Canvas = React.lazy(() => import('@/components/editor/Canvas'))`. Keep the PDFUploader as a static import — it must be in the initial bundle. Add a React.Suspense wrapper with a lightweight fallback (a centered spinner div) around the JSX branch that renders the editor (the branch that runs when pdfFile is not null). The PDFUploader branch needs no Suspense. This causes Vite to emit pdfjs-dist, pdf-lib, react-rnd, and all other editor-only dependencies into a separate async chunk that is only fetched after the user selects a file. `[MODIFY]`
2. **Replace CDN worker URL with local Vite asset URL in Canvas.tsx** — At the top of Canvas.tsx, replace the dynamic string assignment `pdfjs.GlobalWorkerOptions.workerSrc = \`//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs\`` with a Vite ?url import: `import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`, then set `pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc`. This makes Vite copy the worker file to the dist output as a hashed static asset and reference it by local URL, removing the dependency on unpkg.com being reachable and fast. Since Canvas.tsx will now be in the lazy chunk (from step 1), this assignment no longer runs at initial page load. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` home.tsx contains no static import statements for Canvas, Toolbar, ObjectToolbar, LayerPanel, or PropertiesPanel — each is declared via React.lazy(() => import(...))  
  *Verify:* grep for `^import.*Canvas\|^import.*Toolbar\|^import.*LayerPanel\|^import.*PropertiesPanel\|^import.*ObjectToolbar` in client/src/pages/home.tsx — no matches expected (only React.lazy declarations)
- `[c2]` home.tsx wraps the editor-branch JSX (rendered when pdfFile is not null) in <React.Suspense> with a non-null fallback prop  
  *Verify:* Read client/src/pages/home.tsx and confirm the return statement for the pdfFile-exists branch is wrapped in <React.Suspense fallback={...}>
- `[c3]` PDFUploader remains a static import in home.tsx (not lazy)  
  *Verify:* Read client/src/pages/home.tsx and confirm `import { PDFUploader } from '@/components/editor/PDFUploader'` is a regular top-level import, not wrapped in React.lazy
- `[c4]` Canvas.tsx sets pdfjs.GlobalWorkerOptions.workerSrc using a local ?url import, not a string referencing unpkg.com or any other CDN  
  *Verify:* grep for `unpkg.com` in client/src/components/editor/Canvas.tsx — zero matches expected; grep for `?url` — one match expected on the pdfjs worker import line
- `[c5]` Running `npm run build` produces a separate JS chunk containing pdfjs-dist that is NOT part of the main entry chunk  
  *Verify:* Run `npm run build` and inspect dist/assets/ — there should be a chunk file containing 'pdf.worker' in its name, and the main entry chunk should be significantly smaller than before (pdfjs-dist is ~2MB)

**Risks:**
- After selecting a file, the user will see a loading fallback for ~1-3 seconds while the editor chunk downloads on first load — this is intentional and better UX than an invisible freeze, but the fallback must be visible enough to indicate progress
- If vite.config.ts has `build.rollupOptions.external` or similar settings that affect chunking, the dynamic import may not create a separate chunk as expected — verify with `npm run build` output
- The pdfjs-dist/build/pdf.worker.min.mjs file path must exist in node_modules — if the installed version uses a different path (e.g. .js extension), the ?url import will fail at build time with a module-not-found error and the path must be adjusted

---

