# Conversation Log — TASK-9389BD

**Task:** bedac w projekcie nie widze opcji powrotu do listy moich porjektow, nie widze opcji dzielenia sie projektem z innymi uzytkownikami by oni tez mogli wprowadzac w nim zmiany - miec do niego dostep i nie widze opcji zapisu projektu w aplikacji, aby osoba otwierajaca projekt na innym urzadzeniu mogla widziec go takim jaki jest zamiast music importowac w oparciu o moj plik project-bundle wyslany mailem

**Roles:** architect=Claude, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-02 14:21:36

### Claude (Architekt)

**Summary:** The backend (auth, project CRUD, file storage, sharing API, auto-save) is fully implemented. Three purely UI-layer gaps exist in the editor: (1) no 'Back to Projects' button in the Toolbar, (2) no share trigger accessible from within the editor, (3) auto-save runs silently with no visible confirmation. The fix requires adding a RESET_EDITOR reducer action, a reusable ShareProjectDialog component, and three additions to the Toolbar.

**Plan:**
1. **Add RESET_EDITOR action type** — In client/src/lib/types.ts, add `{ type: 'RESET_EDITOR' }` to the EditorAction union type. This action will be dispatched when the user navigates back to the project list, clearing all project state. `[MODIFY]`
2. **Add RESET_EDITOR reducer case** — In client/src/lib/editor-context.tsx, add a case for 'RESET_EDITOR' in editorReducer that returns `{ ...state, ...initialDocumentState }`. This preserves UIState (zoom, tool) but clears pdfFile, projectId, layers, objects, and all document data. Because home.tsx guards on `!docState.pdfFile`, this immediately shows the PDFUploader (project dashboard) without a route change. `[MODIFY]`
3. **Create ShareProjectDialog component** — Create client/src/components/editor/ShareProjectDialog.tsx. It accepts `projectId: string | null` and `open: boolean` and `onOpenChange: (open: boolean) => void` props. Internally it renders a Dialog with: (a) an Input + Button to add a collaborator by username via useShareProject() mutation, (b) success/error toast feedback. It uses useCurrentUser() to gate the share action. Note: PDFUploader.tsx already has an inline share dialog — this new component makes the same functionality available from inside the editor. The PDFUploader's existing inline dialog can remain as-is (no migration required for this task). `[CREATE]`
4. **Add Back, Share, and Save-status to Toolbar** — Modify client/src/components/editor/Toolbar.tsx with three additions: (a) At the leftmost position, add a ChevronLeft/ArrowLeft Button labeled 'Projects' that calls `dispatch({ type: 'RESET_EDITOR' })`. (b) In the right section, add a Share2 icon Button (only rendered when `docState.projectId` is truthy) that sets local state `shareDialogOpen=true` and renders `<ShareProjectDialog>`. (c) Make the isSaving indicator explicitly visible: when `isSaving === true` show a `<Loader2 className='animate-spin'>` with text 'Saving...', otherwise show a `<Check>` icon with text 'Saved' (only when projectId is set, so local-only sessions don't show misleading status). These three additions require: importing ChevronLeft, Share2, Check from lucide-react; adding `shareDialogOpen` useState; importing ShareProjectDialog. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` EditorAction union type in client/src/lib/types.ts includes a `{ type: 'RESET_EDITOR' }` member.  
  *Verify:* Grep for 'RESET_EDITOR' in client/src/lib/types.ts — it must appear in the EditorAction type definition.
- `[c2]` editorReducer in client/src/lib/editor-context.tsx handles 'RESET_EDITOR' by returning state merged with initialDocumentState, which sets pdfFile to null.  
  *Verify:* Read the RESET_EDITOR case in editorReducer and confirm it returns `{ ...state, ...initialDocumentState }` where initialDocumentState has `pdfFile: null`.
- `[c3]` File client/src/components/editor/ShareProjectDialog.tsx exists and exports a React component that accepts props `projectId`, `open`, and `onOpenChange`, and calls the useShareProject() mutation.  
  *Verify:* File exists at the path; grep for 'useShareProject' inside it; grep for 'projectId' and 'onOpenChange' in the component props.
- `[c4]` Toolbar.tsx renders a 'Back to Projects' button that dispatches `{ type: 'RESET_EDITOR' }` on click.  
  *Verify:* Read Toolbar.tsx and confirm a Button with onClick containing `dispatch({ type: 'RESET_EDITOR' })` is present.
- `[c5]` Toolbar.tsx renders a Share button (visible only when docState.projectId is truthy) that opens ShareProjectDialog.  
  *Verify:* Read Toolbar.tsx and confirm conditional rendering of Share button and ShareProjectDialog gated on `docState.projectId`.
- `[c6]` Toolbar.tsx renders a visible save status indicator using the isSaving prop: Loader2 spinner when saving, Check icon when saved (only when projectId is set).  
  *Verify:* Read Toolbar.tsx and confirm isSaving is used to conditionally render Loader2 vs Check icons, gated on docState.projectId.
- `[c7]` Dispatching RESET_EDITOR causes home.tsx to show PDFUploader (project dashboard) because home.tsx guards on `!docState.pdfFile`.  
  *Verify:* Read home.tsx and confirm the guard `if (!docState.pdfFile) return <PDFUploader />` remains intact — no code change needed here, just confirm the existing guard covers the reset path.

**Risks:**
- RESET_EDITOR clears the editor state immediately without confirming unsaved changes — if auto-save is mid-flight (isSaving=true) when the user clicks Back, they could lose the last 2 seconds of changes. Mitigation: disable the Back button while isSaving is true, or show a confirmation dialog.
- The Share button appears for shared collaborators too (not just owners), but the server correctly returns 403 for non-owners — the UI should surface this error via toast so users understand why sharing failed.
- useShareProject mutation in PDFUploader.tsx sends `{ id, username }` — the new ShareProjectDialog must use the same mutation signature to stay consistent with the existing server route POST /api/projects/:id/share.
- Toolbar is already 300+ lines — adding three features may push it past a comfortable size. The ShareProjectDialog extraction mitigates this, but a future sub-component split may be warranted.

---

