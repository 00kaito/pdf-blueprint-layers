# Conversation Log — TASK-996069

**Task:** przy logowaniu nazwa uzytkownika powinna byc case insensitive, dodatkowo wyglada jakby komunikat o bledzie pojawial sie tylko zalogowanemu uzytkownikowi - tzn widze go jesli najpierw wpisze zle haslo, a pozniej dobre - wtedy otwiera sie strona z projektami i widze komunikat invalid credentials (dotyczacy jak przypuszczam wczesniejszej blednej proby zalogowania)

**Roles:** architect=Gemini, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-06 07:10:26

### Gemini (Architekt)

**Summary:** Fix login case-insensitivity by updating storage lookup logic and resolve delayed error messages by moving the Toaster component to the application root.

**Plan:**
1. **Make user lookup case-insensitive in DatabaseStorage** — Update `getUserByUsername` in `server/databaseStorage.ts` to use `sql` with `LOWER()` for a case-insensitive match. `[MODIFY]`
2. **Make user lookup case-insensitive in FileStorage** — Update `getUserByUsername` in `server/fileStorage.ts` to use `toLowerCase()` when comparing usernames. `[MODIFY]`
3. **Globalize Toaster and TooltipProvider in App.tsx** — Move `Toaster` and `TooltipProvider` in `client/src/App.tsx` from the conditional `/` route to the root of the `App` component, ensuring they are always mounted. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` In `server/databaseStorage.ts`, `getUserByUsername` uses `sql` expression with `LOWER()` on both sides of the comparison.  
  *Verify:* Verify code change in `server/databaseStorage.ts`.
- `[c2]` In `server/fileStorage.ts`, `getUserByUsername` uses `toLowerCase()` for comparison.  
  *Verify:* Verify code change in `server/fileStorage.ts`.
- `[c3]` In `client/src/App.tsx`, `Toaster` and `TooltipProvider` are rendered outside of the `Switch` or conditional route logic.  
  *Verify:* Verify code change in `client/src/App.tsx`.
- `[c4]` Logging in with 'USER', 'user', or 'User' succeeds for a user registered as 'user'.  
  *Verify:* Manual test: Register a user and attempt login with different cases.
- `[c5]` Login error messages (toasts) appear immediately on the AuthPage.  
  *Verify:* Manual test: Enter wrong password on login page and verify toast visibility.

**Risks:**
- If existing users have identical usernames differing only by case, `getUserByUsername` will return the first match found by the database.
- Moving `Toaster` might conflict with other layout elements if not placed correctly in the DOM hierarchy.

---

