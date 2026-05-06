# Conversation Log — TASK-8DCA98

**Task:** usprawnij dzialania aplikacji na telefonach - np kiedy loguje sie na uzytkownika nie widze projektow (mimo ze widze je na liscie na desktop) - uzytkownik test, sprawdz czy to problem z mobile czy moze uzytkownik Test i test mala duza litera gdy udostepniam projekt maja znaczenie - jesli ma znaczenie zrobc tak aby wielkosc litery zarobwno przy logowaniu uzytkownika jak i udostpenianiu nie miala znaczenia - uzytkownik z malej czy zduzej itery to ten sam user

**Roles:** architect=Architect, developer=Developer, reviewer=Reviewer

---

## ARCHITECTING — 2026-05-06 09:07:46

### Architect

**Summary:** Implemented case-insensitive username handling by normalizing all usernames to lowercase at the schema, route, and storage levels, and added a startup normalization routine to merge existing accounts that differ only by case.

**Plan:**
1. **Normalize usernames in shared schema** — Updated `insertUserSchema` in `shared/schema.ts` to transform the `username` field to lowercase using Zod's `.transform()`. `[MODIFY]`
2. **Normalize username in sharing route** — Updated the project sharing route in `server/routes.ts` to lowercase the target username before looking it up in the storage. `[MODIFY]`
3. **Implement username normalization and merge logic** — Added `normalizeUsernames` method to `DatabaseStorage` and `FileStorage` to convert existing usernames to lowercase and merge duplicate accounts (transferring project ownership and shares) to solve project visibility issues on mobile. `[MODIFY]`
4. **Run normalization on server startup** — Updated `server/index.ts` to call `storage.normalizeUsernames()` upon server initialization. `[MODIFY]`
5. **Improve mobile login and sharing UI** — Added `autoCapitalize="none"` and `autoComplete="username"` to username input fields in `AuthPage.tsx` and `ShareProjectDialog.tsx` to prevent mobile devices from automatically capitalizing the first letter. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` insertUserSchema in shared/schema.ts transforms username to lowercase  
  *Verify:* Read shared/schema.ts and check for .transform(val => val.toLowerCase()) on the username field
- `[c2]` POST /api/projects/:id/share route normalizes username to lowercase  
  *Verify:* Read server/routes.ts and verify that username from req.body is lowercased before storage lookup
- `[c3]` DatabaseStorage has normalizeUsernames method that merges users  
  *Verify:* Read server/databaseStorage.ts and verify the logic for updating project ownerId and shares during user merge
- `[c4]` FileStorage has normalizeUsernames method that merges users  
  *Verify:* Read server/fileStorage.ts and verify the logic for updating project ownerId and sharedWith array during user merge
- `[c5]` Server startup routine includes username normalization  
  *Verify:* Read server/index.ts and verify that storage.normalizeUsernames() is called in the startup block
- `[c6]` AuthPage username inputs have autoCapitalize='none'  
  *Verify:* Read client/src/pages/AuthPage.tsx and check Input components for autoCapitalize prop
- `[c7]` ShareProjectDialog username input has autoCapitalize='none'  
  *Verify:* Read client/src/components/editor/ShareProjectDialog.tsx and check the Input component for autoCapitalize prop
- `[c8]` All existing tests and type checks pass  
  *Verify:* Run npm run check

**Risks:**
- Merging users might lead to unexpected project lists if the same person created multiple accounts with different projects.
- Database conflicts during normalization if unique constraints are strictly enforced in a way that prevents temporary duplicates (handled by logic check).

---

