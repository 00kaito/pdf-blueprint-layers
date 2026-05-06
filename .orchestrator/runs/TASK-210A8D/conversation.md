# Conversation Log — TASK-210A8D

**Task:** nie widze menu exportu calego projektu i innych przyciskow ktore byly dostepne w projekcie w gornej czesci (po wejsciu w projekt) save, export etc

**Roles:** architect=Architect, developer=Developer, reviewer=Reviewer

---

## ARCHITECTING — 2026-05-06 13:05:02

### Architect

**Summary:** Restored missing editor tools to the top toolbar and consolidated project actions (Save, Export, Share) into organized dropdown menus to improve visibility and user experience.

**Plan:**
1. **Create ToolSelector Component** — Extract the drawing and object addition tools (Select, Draw, Text, Image, Icons, Auto-numbering) from the sidebar ObjectToolbar into a new ToolSelector component. `[CREATE]`
2. **Integrate Tools into Top Bar** — Add the newly created ToolSelector to the main Toolbar component to restore the tools to the upper part of the screen. `[MODIFY]`
3. **Consolidate Project Actions** — Refactor ProjectActions.tsx to group the 'Save' button, 'Export' options (PDF and Project Files), and 'More' options (Share, Open, Settings) into prominent dropdown menus using Shadcn UI. `[MODIFY]`
4. **Cleanup Sidebar** — Remove the ObjectToolbar component from the Home page layout and delete its file, as its functionality has been moved to the top bar. `[DELETE]`

**Acceptance Criteria:**
- `[c1]` Tools (Draw, Text, Icons) are visible in the top Toolbar component  
  *Verify:* Check client/src/components/editor/Toolbar.tsx for the inclusion of <ToolSelector />
- `[c2]` Export actions are grouped under a DropdownMenu  
  *Verify:* Check client/src/components/editor/Toolbar/ProjectActions.tsx for DropdownMenu containing handleFlattenAndDownload and handleExportProject
- `[c3]` ObjectToolbar is completely removed from the project  
  *Verify:* Verify client/src/components/editor/ObjectToolbar.tsx does not exist and is not imported in client/src/pages/home.tsx
- `[c4]` Type checking passes without errors  
  *Verify:* Run npm run check and ensure 0 errors

**Risks:**
- Dropdown menus might overflow or clip if the window is too narrow, though flex wrapping should mitigate this.
- Users accustomed to the sidebar tools might temporarily be confused by the move back to the top bar.

---

