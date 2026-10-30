# Subskrypcje (multi-tenant) + przygotowanie produktu do sprzedaży

## Kontekst
Dziś aplikacja to jedna wspólna przestrzeń: każdy może się zarejestrować (`POST /api/auth/register`), udostępnianie projektu działa po wpisaniu dowolnego loginu z całego systemu (`POST /api/projects/:id/share`), biblioteka ikon jest globalna, a „admin” zarządza wszystkimi kontami. Żeby sprzedawać produkt firmom, potrzebne są **subskrypcje (organizacje)** z własnym adminem, subkontami PM/TECH, limitem użytkowników 5/10/25/100, płatnościami i pełną izolacją danych między firmami.

Decyzje użytkownika: **Stripe** (samoobsługa), **samorejestracja firmy + 14 dni trial**, **limit liczy wszystkie konta** (admin/PM/TECH), **logowanie e-mailem**.

## Model ról
- **Platform admin** (Ty, właściciel produktu) – flaga `users.isPlatformAdmin`; panel wszystkich firm, ręczna zmiana planu/przedłużenie trialu, wsparcie. Nie widzi treści projektów domyślnie.
- **Org admin** (`role: 'admin'`, ale w ramach firmy) – zarządza użytkownikami firmy, rolami, zaproszeniami, płatnościami; widzi wszystkie projekty firmy.
- **PM** – tworzy projekty, udostępnia je członkom firmy.
- **TECH** – bez zmian (to, co zrobiliśmy: requesty, status, zdjęcia, komentarze).

## Model danych (`shared/schema.ts`)
- **`organizations`**: `id, name, plan ('trial'|'team5'|'team10'|'team25'|'team100'), seatLimit, status ('trialing'|'active'|'past_due'|'canceled'), trialEndsAt, currentPeriodEnd, stripeCustomerId, stripeSubscriptionId, createdAt`. Plany i limity w jednym miejscu: `shared/plans.ts` (`PLANS = { team5: { seats: 5, stripePriceEnv: ... }, ... }`, trial = 5 miejsc).
- **`users`**: + `organizationId` (FK), `email` (już jest, unique – staje się loginem), `isPlatformAdmin`, `disabledAt` (dezaktywacja zamiast usuwania – zachowuje autorstwo komentarzy/zdjęć, zwalnia miejsce), `emailVerifiedAt`, `lastLoginAt`.
- **`projects`**: + `organizationId` (indeks). **`icon_library`**: + `organizationId`, `hash` unikalny per firma.
- **`invitations`**: `id, organizationId, email, role, tokenHash, invitedBy, expiresAt, acceptedAt`.
- **`auth_tokens`**: reset hasła / weryfikacja e-maila (`userId, kind, tokenHash, expiresAt, usedAt`).
- **`audit_log`** (lekki): kto dodał/usunął użytkownika, zmienił rolę/plan, usunął projekt.
- Przejście z `drizzle-kit push` na **wersjonowane migracje** (`drizzle-kit generate` + `migrate` przy starcie) – przy klientach nie można polegać na ręcznym `db:push` (patrz błąd `icon_library`).
- **Migracja istniejących danych**: jedna firma „Default” na plan `team100`/`active`, wszyscy obecni użytkownicy i projekty do niej; obecny `admin` = org admin + `isPlatformAdmin`. Konta bez e-maila logują się starym loginem do czasu uzupełnienia e-maila (wymuszone okno po zalogowaniu).

## Etap 1 – Izolacja firm, role, limit miejsc, lista do udostępniania (rdzeń)
- `server/tenancy.ts`: `orgOf(req)`, `sameOrg(entity, user)`, `canAccess(project, user)` = ta sama firma **i** (właściciel / udostępniony / org admin). Wszystkie trasy projektów, plików (`/api/files/:id` sprawdza firmę projektu albo właściciela), ikon, ops, live – przez te helpery. `IStorage`: `listProjectsForUser(user)` z filtrem firmy, `listOrgUsers(orgId)`, `countSeats(orgId)`, ikony per firma.
- **Limit miejsc**: `seatsUsed = aktywni użytkownicy + oczekujące zaproszenia`; sprawdzane przy dodaniu użytkownika, zaproszeniu, przyjęciu zaproszenia i reaktywacji (w transakcji / pod blokadą firmy). Zmiana planu na mniejszy niż użycie – zablokowana z komunikatem „dezaktywuj N użytkowników”.
- **Udostępnianie**: `GET /api/org/members` (id, imię/e-mail, rola) dla PM/admin; `ShareProjectDialog.tsx` przerobiony na listę członków firmy z wyszukiwarką, checkboxami i rolą, pokazuje komu już udostępniono; nowy `DELETE /api/projects/:id/share/:userId` (cofnięcie dostępu). Udostępnić można tylko członkowi tej samej firmy.
- **Panel firmy** (`AdminPage.tsx` → „Team”): pasek „7 / 10 miejsc”, lista z rolą, statusem, ostatnim logowaniem; Dodaj / Zaproś, zmiana roli, dezaktywuj/przywróć, reset hasła; ostatni aktywny org admin nie może sam siebie zdegradować ani dezaktywować.
- Admin-endpointy (`/api/admin/users*`) ograniczone do własnej firmy (dziś admin widzi wszystkich).

## Etap 2 – Rejestracja firmy, e-mail, zaproszenia
- `POST /api/auth/signup`: nazwa firmy, imię, e-mail, hasło → firma (trial 14 dni, 5 miejsc) + org admin; usunięcie obecnej otwartej rejestracji pojedynczych kont (`/api/auth/register`, zakładka „Register” w `AuthPage.tsx`).
- `server/email.ts`: dostawca transakcyjny (np. Resend/Postmark przez SMTP z env); w dev wypisuje maile w konsoli. Szablony: weryfikacja e-maila, zaproszenie, reset hasła, koniec trialu za 3 dni, nieudana płatność.
- Zaproszenia: org admin podaje e-mail + rolę → link `/accept-invite?token=` (ważny 7 dni) → ustawienie hasła. Reset hasła: `/forgot-password`, `/reset-password?token=`. Tokeny przechowywane jako hash.
- Logowanie e-mailem (`server/auth.ts` LocalStrategy: e-mail lub legacy login).

## Etap 3 – Płatności Stripe
- `server/billing.ts`: `POST /api/billing/checkout` (Stripe Checkout, plan + miesięcznie/rocznie), `POST /api/billing/portal` (Customer Portal: karta, faktury, anulowanie), `POST /api/billing/webhook` – rejestrowany **przed** `express.json` (surowe body do weryfikacji podpisu). Webhooki `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed/paid` aktualizują `plan, seatLimit, status, currentPeriodEnd`. Idempotencja po `event.id`.
- Zmiana planu (upgrade/downgrade) przez naszą stronę „Billing” (sprawdza limit miejsc), nie dowolnie w portalu.
- **Egzekwowanie** (`requireActiveSubscription` middleware): trial wygasł / `canceled` / `past_due` po 7 dniach łaski → tryb tylko do odczytu (GET działa, zapisy 402 z komunikatem), baner w aplikacji z przyciskiem „Wybierz plan”. Dane nie są kasowane (retencja np. 90 dni po anulowaniu, potem eksport/usunięcie).
- Stripe Tax (VAT UE, faktury z NIP), ceny w env (`STRIPE_PRICE_TEAM5_MONTHLY`…); bez kluczy Stripe (dev / samodzielna instalacja) płatności są wyłączone, plan ustawia platform admin.

## Etap 4 – Panel platformy (dla Ciebie)
`/platform` (tylko `isPlatformAdmin`): lista firm (plan, status, miejsca, liczba projektów, zajętość miejsca na dysku, ostatnia aktywność), przedłużenie trialu, ręczny plan/rabat, dezaktywacja firmy, podgląd audit logu. Bez wglądu w projekty (prywatność klienta).

## Etap 5 – Co jeszcze jest potrzebne do sprzedaży (checklista)
**Bezpieczeństwo (blokujące – do zrobienia przed pierwszym klientem):**
- Seed `admin` z hasłem `2Park` wpisanym w kod i wypisywanym w logu (`server/auth.ts` `seedAdminUser`) → pierwsze konto platform admina z env (`PLATFORM_ADMIN_EMAIL` + jednorazowe hasło/link), bez logowania haseł.
- Domyślne `SESSION_SECRET` (`server/config.ts`, `docker-compose.yml`) – w produkcji start ma się nie udać bez ustawionego sekretu.
- Polityka haseł (min. 10 znaków), limit prób logowania (rate limit + opóźnienie), `helmet`, ciasteczko sesji `secure`/`httpOnly`/`sameSite=lax`, HTTPS.
- Testy izolacji firm (automatyczne) – najważniejszy test produktu wielofirmowego.

**Operacje:** codzienne kopie zapasowe Postgresa **i** katalogu `storage/` + przetestowane odtwarzanie; monitoring błędów (Sentry), uptime/health-check (`/api/health`), środowisko staging ze Stripe w trybie testowym; limity miejsca na pliki per plan (PDF-y i zdjęcia rosną najszybciej – np. 10/25/100/500 GB) i licznik zajętości.

**Prawo (UE/PL):** Regulamin (ToS), Polityka prywatności, **umowa powierzenia danych (DPA)** – klienci wgrywają plany budynków i zdjęcia; informacja o cookies (tylko niezbędne → bez banera zgód); eksport danych firmy (ZIP: PDF-y, zdjęcia, JSON projektów) i usunięcie konta firmy na żądanie (RODO).

**Sprzedaż i onboarding:** strona z cennikiem (5/10/25/100 miejsc, rabat za rok), przykładowy projekt po rejestracji, krótki przewodnik pierwszego uruchomienia, kanał wsparcia (e-mail/czat), status page, poprawne meta/tytuł/og:image w `client/index.html` (dziś z szablonu Replit), domena i e-mail firmowy (SPF/DKIM dla maili transakcyjnych).

**Opcjonalnie później:** SSO (Google/Microsoft) dla wyższego planu, funkcje zależne od planu (np. branding w eksporcie PDF), analityka produktu, program poleceń.

## Kluczowe pliki
- `shared/schema.ts`, nowy `shared/plans.ts`; migracje w `migrations/`.
- `server/storage_interface.ts`, `server/databaseStorage.ts`, `server/fileStorage.ts` (wersja plikowa: jedna domyślna firma, do dev).
- `server/auth.ts`, `server/routes.ts` (+ nowe `server/tenancy.ts`, `server/billing.ts`, `server/email.ts`), `server/index.ts` (kolejność webhooka Stripe).
- Klient: `pages/AdminPage.tsx` (Team), `pages/AuthPage.tsx` (signup/forgot), nowe strony accept-invite / reset-password / billing / platform w `App.tsx`, `components/editor/ShareProjectDialog.tsx`, `hooks/useAuth.ts` (`/api/auth/me` zwraca firmę, plan, status, miejsca), baner subskrypcji w `pages/home.tsx` i liście projektów.

## Kolejność i zakres pierwszej iteracji
Proponuję wdrażać etapami; **Etap 1 + bezpieczeństwo z Etapu 5** to pierwsza iteracja (działa od razu dla obecnych danych, bez Stripe). Potem Etap 2, 3, 4.

## Weryfikacja
- `npx tsc --noEmit -p .`
- Skrypt testów (`npx tsx`, wzorem testów ops) na tymczasowej bazie: dwie firmy – użytkownik firmy B dostaje 403/404 na projekt, plik, ikonę, ops i live firmy A; udostępnienie użytkownikowi innej firmy odrzucone; limit miejsc (6. konto przy planie 5 → błąd, dezaktywacja zwalnia miejsce, zaproszenia liczą się do limitu); ostatni org admin nie może się zdegradować.
- Migracja na kopii obecnej bazy: wszyscy użytkownicy/projekty w firmie „Default”, logowanie starym loginem działa.
- Stripe w trybie testowym: `stripe listen --forward-to localhost:5000/api/billing/webhook`, karta testowa → plan aktywny i limit zmieniony; `invoice.payment_failed` → po okresie łaski tryb tylko do odczytu; anulowanie → baner, dane zostają.
- Ręcznie w przeglądarce: rejestracja firmy → zaproszenie PM i TECH (mail w konsoli) → PM udostępnia projekt z listy członków → TECH widzi projekt i działa jak dotąd.
