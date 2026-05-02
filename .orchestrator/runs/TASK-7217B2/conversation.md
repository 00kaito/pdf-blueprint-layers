# Conversation Log — TASK-7217B2

**Task:** tworze projekt z pdf dodaje do niego obiekty, pozniej po ponownym wejsciu w projekt widze tylko pdf (nie widze naniesionych obiektow) - chce miec przycisk zapisz ktory zapisze ten projekt w aplikacji; Ponadto zmien nazwe przycisku export pdf do merge layers and export as pdf, oraz zmien obecny przycisk save na export project files

**Roles:** architect=Claude, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-02 14:35:52

### Claude (Architekt)

**Summary:** Fix project reload bug (SET_PDF wipes layers/objects after IMPORT_PROJECT), add a server-side Save button, rename 'Export PDF' to 'Merge Layers and Export as PDF', and rename the current 'Save' button to 'Export Project Files'.

**Plan:**
1. **Fix project reload bug in PDFUploader.tsx** — In handleOpenProject, the dispatch order is wrong: IMPORT_PROJECT (which restores saved layers/objects) is called on line 112, then SET_PDF is called on line 113 which hard-resets layers=[] and objects=[] back to defaults, destroying the restored state. Fix: move the IMPORT_PROJECT dispatch to AFTER SET_PDF, SET_OVERLAY_PDF, and SET_PDF_FILE_IDS so it has the final word. New order: (1) SET_PDF, (2) SET_OVERLAY_PDF, (3) SET_PDF_FILE_IDS, (4) IMPORT_PROJECT. `[MODIFY]`
2. **Create useManualSave hook** — Create a new hook client/src/hooks/useManualSave.ts that exposes handleSave and isSaving. Logic: (A) if docState.projectId is set, call useSaveProject.mutateAsync({ id: docState.projectId, state: { layers, objects, customIcons, exportSettings, autoNumbering, overlayOpacity, pdfFileId, overlayPdfFileId } }) and show a toast on success/failure. (B) if docState.projectId is null and docState.pdfFile is not null, call useCreateProject.mutateAsync({ name: pdfFile.name or 'New Project' }), then useUploadFile.mutateAsync({ file: pdfFile, projectId: project.id }), then dispatch SET_PROJECT_ID and SET_PDF_FILE_IDS with the resulting IDs, then call useSaveProject.mutateAsync with the full state. (C) if both are null, show a toast error 'No project to save'. `[CREATE]`
3. **Update Toolbar.tsx: rename buttons and add Save button** — Three changes in Toolbar.tsx: (1) Find the 'Save' button (line ~157, handler handleExportProject) and rename its label to 'Export Project Files'. (2) Find the 'Export PDF' button (line ~200, handler handleFlattenAndDownload) and rename its label to 'Merge Layers and Export as PDF'. (3) Import useManualSave and add a new 'Save' button — position it near the top of the toolbar button group (logically first or next to the Share button), using a Cloud or Save icon, calling handleSave from the hook, and disabling it while isSaving is true. The Save button should only be visible when docState.pdfFile is set (same condition as other action buttons). `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` After opening an existing server-side project via PDFUploader, docState.objects and docState.layers match the saved project state (are not empty after load)  
  *Verify:* In PDFUploader.tsx handleOpenProject, confirm IMPORT_PROJECT dispatch appears after SET_PDF, SET_OVERLAY_PDF, and SET_PDF_FILE_IDS dispatches (i.e. IMPORT_PROJECT is the last dispatch)
- `[c2]` File client/src/hooks/useManualSave.ts exists and exports a useManualSave function returning { handleSave: () => Promise<void>, isSaving: boolean }  
  *Verify:* File exists at client/src/hooks/useManualSave.ts; grep for 'export function useManualSave' or 'export const useManualSave'
- `[c3]` useManualSave calls useSaveProject mutation when docState.projectId is non-null  
  *Verify:* In useManualSave.ts, confirm there is a branch checking docState.projectId and calling saveProject.mutateAsync with id and state payload
- `[c4]` useManualSave calls useCreateProject then useUploadFile then dispatches SET_PROJECT_ID when docState.projectId is null and docState.pdfFile is non-null  
  *Verify:* In useManualSave.ts, confirm the else branch calls createProject.mutateAsync, uploadFile.mutateAsync, and dispatches { type: 'SET_PROJECT_ID', payload: ... }
- `[c5]` Toolbar.tsx contains a button with the label 'Export Project Files' that calls handleExportProject  
  *Verify:* grep for 'Export Project Files' in client/src/components/editor/Toolbar.tsx
- `[c6]` Toolbar.tsx contains a button with the label 'Merge Layers and Export as PDF' that calls handleFlattenAndDownload  
  *Verify:* grep for 'Merge Layers and Export as PDF' in client/src/components/editor/Toolbar.tsx
- `[c7]` Toolbar.tsx contains a new Save button that imports and calls handleSave from useManualSave, disabled while isSaving is true  
  *Verify:* grep for 'useManualSave' in Toolbar.tsx; confirm button JSX includes isSaving as disabled condition and calls handleSave

**Risks:**
- SET_PDF resets activeLayerId as well as layers/objects — after IMPORT_PROJECT the activeLayerId from the saved state will restore, but if the saved projectId referenced a layer that was deleted the editor could silently use a stale activeLayerId. Mitigation: IMPORT_PROJECT already sets activeLayerId from the saved payload so this is handled.
- When creating a new server project from within Toolbar (no existing projectId), the overlayPdfFile is currently not uploaded in the useManualSave happy path — only the main PDF is uploaded. If the user had an overlay, it will be missing after the project is reopened. Mitigation: extend useManualSave to also call uploadFile for overlayPdfFile if docState.overlayPdfFile is non-null and dispatch SET_PDF_FILE_IDS accordingly.
- useImport.ts (the 'Open' button) parses a projectId from the imported JSON and passes it through IMPORT_PROJECT. If that projectId belongs to another user's server project, the manual Save button would overwrite that project. Mitigation: strip projectId from locally-imported files, or validate ownership before saving.

---

