# Conversation Log — TASK-2098D4

**Task:** przy zapisie projektu (do json) chcialbym aby pobierane byly tez uzywane ikony, aby pozniej podczas importu zamiast bazowac na zrodlowej lokalizacji plikow moc bazowac na lokalizacji tego katalogu gdzie mam json - czyli pobieram zip projektu, gdzies go rozpakowuje i gdy robie import,  
   wiem ze w tym samym katalogu gdzie jest jsonm,, znajduja sie tez wszystkie potrzebne pliki/obrazy/ikonyu, wiec w locie podczas importu powinien pobirac je z lokalizacji pliku json

**Roles:** architect=Gemini, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-01 09:51:06

### Gemini (Architekt)

**Summary:** The project will be updated to bundle all project data (JSON, PDF, and images) into a ZIP file upon export. The import process will be enhanced to support both ZIP files and directory uploads, allowing assets to be resolved from relative paths as requested.

**Plan:**
1. **Add ZIP library** — Add `jszip` and its type definitions to `package.json` to enable bundle creation and extraction in the browser. `[MODIFY]`
2. **Update Export Logic** — Modify `useExport.ts` to generate a ZIP file. The ZIP will contain `project.json`, the source PDF file, and an `assets/` folder for images and custom icons. Update the JSON structure to use relative paths for these assets instead of embedding large Base64 strings. `[MODIFY]`
3. **Update Import Interface** — Enhance `PDFUploader.tsx` to handle `.zip` files and directory selections (`webkitdirectory`). Implement logic to resolve asset paths from the uploaded bundle or directory and convert them back to usable URLs (Data/Blob) for the editor state. `[MODIFY]`
4. **Maintain Backward Compatibility** — Ensure the `IMPORT_PROJECT` reducer action and the import logic in `PDFUploader.tsx` still support legacy standalone `.json` files containing embedded Base64 assets. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` Exporting a project generates a `.zip` file containing `project.json`, `document.pdf`, and an `assets/` directory.  
  *Verify:* Trigger export in the UI and inspect the downloaded ZIP file structure.
- `[c2]` `project.json` inside the ZIP uses relative paths (e.g., 'assets/image_1.png') for image content instead of Base64.  
  *Verify:* Extract the ZIP and check the `content` fields in the `project.json` file.
- `[c3]` Importing the generated ZIP file restores the full project state including the PDF and all visual objects.  
  *Verify:* Upload a previously exported ZIP via the 'Import' tool and verify layers, icons, and images appear correctly.
- `[c4]` Importing a folder (directory upload) containing the extracted ZIP content correctly resolves assets.  
  *Verify:* Use the directory upload option, select an unzipped project folder, and verify all assets load correctly.
- `[c5]` Legacy `.json` files with embedded Base64 data can still be imported.  
  *Verify:* Import an old `project.json` file and verify it loads without errors.
- `[c6]` The PDF file is automatically loaded into the viewer when a ZIP project is imported.  
  *Verify:* Import a ZIP and ensure the canvas displays the correct PDF document immediately.

**Risks:**
- High memory consumption when Zipping very large PDF files or many high-resolution images.
- Dependency on `jszip` which must be compatible with the current build environment.
- Directory upload (`webkitdirectory`) is not supported in all browsers (e.g., older versions or specific mobile browsers).

---

## FOLLOW-UP INITIATED — 2026-05-01 10:12:29

**User instruction:** Follow-up request: continue

---

## HUMAN_FEEDBACK — iter 1 — 2026-05-01 10:12:50

### Gemini (Analiza feedbacku → plan naprawy)

**Root cause:** The previous implementation was interrupted and left in an incomplete state: `PDFUploader.tsx` is truncated mid-function (`handleDirectoryImport`), and the export logic in `useExport.ts` was never implemented.

**Fix steps:**
1. Complete the `handleDirectoryImport` function in `client/src/components/editor/PDFUploader.tsx` to find `project.json` and resolve assets (images/icons) from the file list using `webkitRelativePath`.  
   *files:* client/src/components/editor/PDFUploader.tsx
2. Update `handleFileChange` in `PDFUploader.tsx` to handle `.zip` files by calling `handleZipImport`, and ensure the UI provides a way to trigger directory imports (e.g., via `dirInputRef`).  
   *files:* client/src/components/editor/PDFUploader.tsx
3. Implement the `exportToZip` function in `client/src/hooks/useExport.ts` using `JSZip` to bundle the project JSON, the source PDF, and all image assets into a single ZIP file.  
   *files:* client/src/hooks/useExport.ts
4. Verify and add `jszip` to `package.json` if it was not successfully installed in the previous iteration.  
   *files:* package.json

**Key fix:** Complete the truncated import logic in `PDFUploader.tsx` and implement the missing ZIP bundling logic in `useExport.ts`.

---

