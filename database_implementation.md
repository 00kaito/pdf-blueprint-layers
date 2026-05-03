# Database Implementation Guidelines

## Co propozycja ma rację

Wszystkie trzy zidentyfikowane problemy są realne w tym projekcie:
- `MemoryStore` dla sesji → restart = wylogowanie wszystkich
- Atomowe zapisy JSON są OK dla 1 użytkownika, ale przy równoczesnych auto-save'ach od kilku sesji ryzyko rośnie
- `FileStorage` ładuje całą zawartość plików do Map w RAM przy starcie

Wybór PostgreSQL + Drizzle jest prawidłowy — Drizzle jest już skonfigurowany w projekcie.

---

## Słabe strony i co zmienić

### 1. `project_states` jako osobna tabela — zbędna komplikacja

Propozycja dzieli na `projects` i `project_states` (relacja 1:1). To dodaje JOIN lub drugi query bez żadnej korzyści — stan zawsze istnieje dokładnie jeden per projekt. Już teraz projekt robi to samo przez osobne pliki JSON, co generuje dwa odczyty przy ładowaniu projektu.

**Zamiast tego:** jedna tabela `projects` z kolumną `state jsonb`. Lista projektów pomija `state` przez `SELECT id, name, owner_id, updated_at FROM projects` — bez potrzeby osobnej tabeli.

---

### 2. Brak indeksów

Dla tabel które będą zapytywane po kluczu obcym, PostgreSQL bez indeksów robi pełny scan.

**Niezbędne indeksy:**
```sql
projects(owner_id)
project_shares(user_id)
project_shares(project_id)
files(project_id)
files(owner_id)
```

---

### 3. Auto-save 1s do PostgreSQL — za agresywny

Obecny `useAutoSave` ma debounce 1000ms i zapisuje cały state (165KB jako JSONB). Zapis pliku JSON to operacja O/S, zapis do PostgreSQL to sieciowy round-trip + WAL + vacuum. Przy intensywnej edycji to 60 writów/minutę po 165KB każdy.

**Zalecenie:** Zwiększyć debounce do 2–3 sekund. Opcjonalnie dodać "dirty flag" — nie wysyłać jeśli state nie zmienił się względem ostatniego zapisu (hooks `useAutoSave` już to częściowo robi przez `lastSavedStateRef`, ale warto to sprawdzić po migracji).

---

### 4. Upload plików przez `memoryStorage` — cały plik w RAM

Aktualnie `multer` używa `memoryStorage` — plik trafia w całości do `Buffer` w pamięci przed zapisem na dysk. Przy uploaderze PDF 30MB to 30MB zablokowane w RAM przez czas zapisu.

**Zamiast:** `multer.diskStorage` z `destination` wskazującym docelowy katalog — plik strumieniuje prosto na dysk bez buforowania.

---

### 5. Organizacja plików — custom icons nie mają projektu

Propozycja sugeruje `/storage/projects/{project_id}/{file_id}`. Problem: custom icons w `customIcons[]` są per-user, nie per-project (użytkownik może ich używać w wielu projektach). Aktualne `FileMetadata` ma `projectId?` jako opcjonalne.

**Struktura:**
```
/storage/
  projects/{project_id}/    ← PDF blueprint, overlay PDF, zdjęcia obiektów
  users/{user_id}/icons/    ← custom icons (współdzielone między projektami)
```

---

### 6. `sharedWith` array → tabela `project_shares` — dobra decyzja, ale wymaga migracji danych

Propozycja poprawnie identyfikuje problem: szukanie "wszystkich projektów współdzielonych ze mną" przy tablicy `sharedWith` wymaga skanu wszystkich projektów. Tabela jest lepsza.

Ważne: podczas migracji trzeba rozłożyć obecne tablice `sharedWith` z `projects.json` na wiersze w `project_shares`.

---

### 7. Brak `email` w schemacie użytkownika

Aktualne `users`: `id, username, password_hash`. Brak emaila uniemożliwia reset hasła w przyszłości.

**Warto dodać teraz:** `email text unique` (nullable na start, żeby nie blokować migracji istniejących kont bez emaila).

---

### 8. Transakcje przy tworzeniu projektu

`useManualSave` robi: utwórz projekt → uploaduj PDF → zapisz state — trzy osobne requesty HTTP. Jeśli któryś padnie, projekt istnieje bez PDF lub bez state.

**W `DatabaseStorage`:** operacje tworzenia projektu powinny być w transakcji Drizzle: `db.transaction(async (tx) => { ... })`.

---

## Poprawiony schemat

```ts
// users
id, username, email (nullable), password_hash, created_at

// projects
id, owner_id → users.id, name, state jsonb, created_at, updated_at

// project_shares
project_id → projects.id, user_id → users.id
PRIMARY KEY (project_id, user_id)

// files
id, owner_id → users.id, project_id → projects.id (nullable),
original_name, mime_type, size, storage_path, created_at
```

---

## Plan migracji — co brakuje w oryginalnej propozycji

Propozycja wymienia kroki, ale pomija:
1. Ustawienie `DATABASE_URL` w środowisku przed jakimkolwiek krokiem
2. `drizzle-kit push` lub `drizzle-kit migrate` żeby stworzyć tabele
3. Walidację danych po migracji (czy liczba projektów/plików się zgadza)
4. Zmianę `MemoryStore` → `connect-pg-simple` **przed** testem na wielu urządzeniach — bo bez tego każdy restart niszczy cel synchronizacji

**Kolejność kroków:**
1. Ustawić `DATABASE_URL` w `.env`
2. Zaktualizować `shared/schema.ts` — definicje tabel Drizzle
3. Uruchomić `drizzle-kit push` — stworzyć tabele w PostgreSQL
4. Zaimplementować `DatabaseStorage` — ta sama klasa co `FileStorage` ale z Drizzle zamiast JSON
5. Napisać skrypt migracyjny — odczytać `users.json`, `projects.json`, pliki z `/data/` i wpisać do PostgreSQL
6. Zmienić `MemoryStore` → `connect-pg-simple` w `auth.ts`
7. Podmienić `storage` w `storage.ts` z `FileStorage` na `DatabaseStorage`
8. Zwalidować dane — porównać liczby rekordów przed i po migracji
9. Przenieść pliki z `/data/files/` do nowej struktury `/storage/`

---

## Podsumowanie zmian względem oryginalnej propozycji

| Propozycja | Zmiana |
|---|---|
| `projects` + `project_states` (2 tabele) | `projects` z kolumną `state jsonb` (1 tabela) |
| Brak indeksów | Dodać 5 indeksów na FK |
| Bez komentarza o auto-save | Debounce 2–3s zamiast 1s |
| `memoryStorage` dla uploadów | `diskStorage` — streaming bez buforowania w RAM |
| `/storage/projects/{id}/...` dla wszystkiego | Osobny katalog `users/{id}/icons/` dla custom ikon |
| Brak `email` w users | `email` nullable od razu w schemacie |
| Brak transakcji | Transakcje Drizzle przy tworzeniu projektu |
