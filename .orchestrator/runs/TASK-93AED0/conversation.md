# Conversation Log — TASK-93AED0

**Task:** przy zapisie projektu (do json) chcialbym aby pobierane byly tez uzywane ikony, aby pozniej podczas importu zamiast bazowac na zrodlowej lokalizacji plikow moc bazowac na lokalizacji tego katalogu gdzie mam json - czyli pobieram zip projektu, gdzies go rozpakowuje i gdy robie import,  
   wiem ze w tym samym katalogu gdzie jest jsonm, (wiec zapis pakuje pdf file, assets/ikons i ich lokalizacja (json file), znajduja sie tez wszystkie potrzebne pliki/obrazy/ikonyu, wiec w locie podczas importu powinien pobirac je z lokalizacji pliku json

**Roles:** architect=Claude, developer=Gemini, reviewer=Claude

---

## ARCHITECTING — 2026-05-01 12:46:37

### Claude (Architekt)

**Summary:** Modify handleExportProject in useExport.ts to embed all image and icon assets as inline base64 data-URLs directly in project.json instead of writing them to a separate assets/ folder in the ZIP. This makes project.json self-contained so that importing it standalone (after extracting the ZIP) works without needing any sibling files. Also fix handleZipImport and handleDirectoryImport to resolve assets/ paths for both image and icon type objects for backward compatibility with old ZIPs.

**Plan:**
1. **Replace processAsset with toDataUrl in useExport.ts** — Inside handleExportProject, replace the existing processAsset helper function (which saves assets to a ZIP folder and returns an assets/ path) with a new toDataUrl async helper. toDataUrl: for blob: URLs — fetch the blob, read as ArrayBuffer, convert to base64 with btoa, return a data: URL with correct mime type. For data: URLs — return unchanged. For anything else (e.g. built-in icon name strings) — return unchanged. Keep the assetCache Map for deduplication (same blob: URL → same data: URL). Remove the assetsFolder (zip.folder('assets')) creation entirely. `[MODIFY]`
2. **Update handleExportProject to call toDataUrl for all asset fields** — Replace all three processAsset call sites with toDataUrl: (1) in finalObjects mapping for obj.type === 'image', convert obj.content; (2) in finalCustomIcons mapping, convert icon.url; (3) add a new branch in finalObjects for obj.type === 'icon' where obj.content starts with 'data:' or 'blob:' — convert obj.content (this covers any edge case where an icon type object holds a URL rather than a built-in shape name). Remove the assetsFolder variable and any zip.folder('assets') call. `[MODIFY]`
3. **Fix backward-compat in handleZipImport for icon type objects** — In handleZipImport, extend the resolvedObjects Promise.all map to also resolve icon type objects whose content starts with 'assets/'. Old ZIPs exported before this change stored icon assets in the assets/ folder. New ZIPs will have inline data: URLs so the condition `path.startsWith('assets/')` inside resolveAsset will return false and the data: URL passes through unchanged. `[MODIFY]`
4. **Fix backward-compat in handleDirectoryImport for icon type objects** — Apply the same condition change as step 3 to handleDirectoryImport's resolvedObjects map, so that old project directories with assets/ folders correctly resolve icon type object contents. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` In handleExportProject, no call to zip.folder('assets') exists and no files are written to an assets subfolder inside the ZIP  
  *Verify:* Read client/src/hooks/useExport.ts: grep for 'assetsFolder' and 'assets' — neither should appear in handleExportProject after the change
- `[c2]` A toDataUrl (or equivalent named) async function exists inside handleExportProject in useExport.ts that accepts a string and returns Promise<string>, handling blob:, data:, and plain strings  
  *Verify:* Read client/src/hooks/useExport.ts: the function body handles the three cases — blob: (fetch+readAsDataURL), data: (return as-is), other (return as-is)
- `[c3]` In handleExportProject, finalObjects processing applies toDataUrl to both image type objects and icon type objects whose content is a URL (starts with 'data:' or 'blob:')  
  *Verify:* Read client/src/hooks/useExport.ts finalObjects Promise.all map: two conditions present — one for obj.type === 'image', one for obj.type === 'icon' with URL content check
- `[c4]` In handleExportProject, finalCustomIcons processing applies toDataUrl to each icon's url field instead of processAsset  
  *Verify:* Read client/src/hooks/useExport.ts finalCustomIcons Promise.all map: calls toDataUrl(icon.url) not processAsset
- `[c5]` In handleZipImport in useImport.ts, the resolvedObjects map handles both image type objects and icon type objects with assets/ content paths  
  *Verify:* Read client/src/hooks/useImport.ts handleZipImport: condition includes obj.type === 'icon' check alongside obj.type === 'image'
- `[c6]` In handleDirectoryImport in useImport.ts, the resolvedObjects map handles both image type objects and icon type objects with assets/ content paths  
  *Verify:* Read client/src/hooks/useImport.ts handleDirectoryImport: condition includes obj.type === 'icon' check alongside obj.type === 'image'
- `[c7]` The generated project.json inside the ZIP contains no strings starting with 'assets/' — all image and custom icon data is stored as data: URL strings  
  *Verify:* Export a project with a custom icon, extract the ZIP, open project.json and search for 'assets/' — no matches should exist

**Risks:**
- JSON file size increase: base64 encoding adds ~33% overhead and large projects with many images may produce a project.json of several MB to tens of MB, potentially causing slow import/export or browser memory pressure
- Blob URL lifetime: if a blob: URL was revoked before export runs (e.g. user replaced a PDF), fetch() inside toDataUrl will fail — handle the fetch error gracefully by falling back to the original string rather than silently breaking the export
- Backward compatibility in import: old ZIPs with assets/ folder must still import correctly — the condition `obj.content.startsWith('assets/')` in the resolvedObjects map is the guard, but it must be tested with an actual pre-change ZIP file to verify the path
- customIcons entries with blob: URLs: if the user uploaded icons in the same session, their blob: URLs should still be alive at export time; but if the page was refreshed or the icon was re-added, the blob may be invalid — the toDataUrl fetch error handling is critical here

---

