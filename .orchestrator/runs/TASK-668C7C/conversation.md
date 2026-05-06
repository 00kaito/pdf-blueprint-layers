# Conversation Log — TASK-668C7C

**Task:** przeanalizuj czy nie ma za duzo redundancji w kwestii wersji na produkcje a wersji lokalnej - czy moze da sie podejsc jakosc sprytniej do rozdzielnia by nie mieszac za duzo zaleznosci - czyli w 1-2 miejscach trzymac zmienne albo informacje odpowiedizalne za to czy to jest deploy lokalny czy produkcyjny - cel nie tworzyc zlozonego lancucha zaleznosci

**Roles:** architect=Architect, developer=Developer, reviewer=Reviewer

---

## ARCHITECTING — 2026-05-06 11:24:11

### Architect

**Summary:** Centralized environment configuration in `server/config.ts` and implemented dynamic storage/session loading to decouple local and production dependencies.

**Plan:**
1. **Create server/config.ts** — Create a centralized configuration file that handles `.env` loading and exports an environment-aware `config` object. `[CREATE]`
2. **Decouple storage interface** — Move `IStorage` interface to `server/storage_interface.ts` to prevent circular dependencies during dynamic imports. `[CREATE]`
3. **Refactor storage.ts for dynamic loading** — Use top-level await and dynamic imports to instantiate either `FileStorage` or `DatabaseStorage` based on `config.storageType`. `[MODIFY]`
4. **Refactor auth.ts for conditional session store** — Dynamically select `PostgresStore` or `MemoryStore` at runtime to avoid importing database dependencies when using file storage. `[MODIFY]`
5. **Unify server entry point** — Update `server/index.ts` to use the new `config` object and await asynchronous configuration steps. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` File `server/config.ts` exists and centralizes environment variable access.  
  *Verify:* Check file existence and content of `server/config.ts`.
- `[c2]` Database connection in `server/db.ts` is only initialized if `config.storageType` requires it.  
  *Verify:* Verify dynamic imports in `server/storage.ts` and `server/auth.ts`.
- `[c3]` Server starts successfully in both 'file' and 'database' storage modes.  
  *Verify:* Check logs for '[Storage] Initializing storage: file' or '[Storage] Initializing storage: database'.
- `[c4]` Session store in `server/auth.ts` switches between MemoryStore and PostgresStore based on configuration.  
  *Verify:* Inspect `configureAuth` implementation in `server/auth.ts`.

**Risks:**
- Top-level await requires Node.js 14.8+ and ESM support, which is enabled via 'type: module' in package.json.
- Circular dependencies if storage implementations incorrectly import the storage factory.

---

