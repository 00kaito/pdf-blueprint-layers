# Conversation Log — TASK-F22156

**Task:** popraw plik docker-compose pod katem danych bazy, oraz spojnosci z aplikacja - upewnij sie ze docker-compose up zadziala

**Roles:** architect=Claude, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-02 22:28:07

### Claude (Architekt)

**Summary:** Dwa blokujące problemy uniemożliwiają działanie docker-compose up: (1) `drizzle-kit` jest w devDependencies, więc nie jest instalowany w warstwie runner Dockerfile'a — CMD `npx drizzle-kit push` kończy się błędem; (2) `depends_on: db` czeka tylko na uruchomienie kontenera, nie na gotowość PostgreSQL — migracja odpala się zanim baza zaakceptuje połączenia. Naprawa: przeniesienie `drizzle-kit` do dependencies + dodanie healthcheck z `condition: service_healthy`.

**Plan:**
1. **Healthcheck db + condition w app.depends_on** — W serwisie `db` dodać blok `healthcheck` używający `pg_isready`, który sprawdza gotowość PostgreSQL (interval 5s, timeout 5s, retries 5). W serwisie `app` zmienić `depends_on` z prostej listy na mapę obiektów z `condition: service_healthy`, żeby app startował dopiero gdy PostgreSQL faktycznie akceptuje połączenia. `[MODIFY]`
2. **Przenieś drizzle-kit do dependencies** — Przenieść wpis `drizzle-kit` z bloku `devDependencies` do bloku `dependencies` w package.json. W Dockerfile runner stage uruchomiane jest `npm ci --omit=dev`, więc devDependencies nie są instalowane — `npx drizzle-kit push` w CMD nie znajdzie pakietu i zwróci błąd. Po przeniesieniu drizzle-kit będzie dostępny w warstwie produkcyjnej. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` Serwis `db` w docker-compose.yml posiada blok `healthcheck` z kluczami `test`, `interval`, `timeout`, `retries`; `test` wywołuje `pg_isready`  
  *Verify:* Odczytać docker-compose.yml, sprawdzić czy services.db.healthcheck.test zawiera `pg_isready`
- `[c2]` Serwis `app` w docker-compose.yml ma `depends_on.db.condition: service_healthy`  
  *Verify:* Odczytać docker-compose.yml, sprawdzić czy services.app.depends_on.db.condition == 'service_healthy'
- `[c3]` `drizzle-kit` widnieje w sekcji `dependencies` (nie tylko `devDependencies`) w package.json  
  *Verify:* Odczytać package.json, sprawdzić czy klucz `drizzle-kit` istnieje w bloku `dependencies`
- `[c4]` `drizzle-kit` NIE istnieje już w sekcji `devDependencies` w package.json  
  *Verify:* Odczytać package.json, sprawdzić że klucz `drizzle-kit` nie istnieje w bloku `devDependencies`

**Risks:**
- Przeniesienie drizzle-kit do dependencies zwiększa rozmiar obrazu Docker i instalację produkcyjną — drizzle-kit jest ciężki (~40MB), ale nie ma lepszej alternatywy bez przepisania CMD na skrypt z drizzle-orm
- Jeśli PostgreSQL nie uruchomi się w czasie 5 retries × 5s = 25s (np. bardzo wolna maszyna), app nie wystartuje — można podnieść `retries` do 10 lub `start_period` dodać dla bezpieczeństwa

---

