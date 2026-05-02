# Analiza Architektoniczna: Ewolucja z MVP do Systemu Enterprise

Niniejszy dokument analizuje obecną architekturę aplikacji (wersja MVP) i wskazuje ścieżkę rozwoju w stronę profesjonalnego rozwiązania typu SaaS dla branży niskoprądowej.

## 1. Zarządzanie Użytkownikami i Uprawnieniami (Auth & IAM)

### Stan Obecny (MVP)
*   Prosta tabela `users` (ID, username, hash hasła).
*   Brak ról — każdy zalogowany użytkownik ma te same uprawnienia w obrębie projektu (współdzielenie przez ID).
*   Uproszczona identyfikacja technika w `localStorage` dla "trust-based tracking".

### Ewolucja (Enterprise)
*   **Multi-tenancy (Organizacje):** Wprowadzenie pojęcia "Firma/Organizacja". Użytkownicy należą do organizacji, a projekty są własnością firmy, nie tylko jednostki.
*   **RBAC (Role-Based Access Control):** 
    *   `Admin`: Pełne zarządzanie firmą i projektami.
    *   `Manager (PM)`: Tworzenie projektów, przydzielanie zadań, akceptacja statusów.
    *   `Technician`: Tylko odczyt planów, zmiana statusów, dodawanie zdjęć.
    *   `Client/Viewer`: Tylko podgląd postępu i eksport raportów.
*   **SSO & External Auth:** Integracja z Azure AD / Microsoft 365 (standard w dużych firmach instalacyjnych) lub Google Workspace.

## 2. Model Danych i Skalowalność (Data Strategy)

### Stan Obecny (MVP)
*   Cały stan projektu (`EditorObject[]`, `Layer[]`) przechowywany jako jeden duży obiekt JSON w bazie danych.
*   Podejście "wszystko albo nic" przy zapisie i odczycie.

### Ewolucja (Enterprise)
*   **Relacyjność Obiektów:** Wyciągnięcie `objects` (punktów na planie) do osobnej tabeli relacyjnej.
    *   *Dlaczego?* Pozwala to na zaawansowane filtrowanie (np. "pokaż wszystkie gniazda DATA na piętrze 2"), raportowanie cross-projektowe i wydajną aktualizację pojedynczych rekordów bez przesyłania całego planu (5MB+).
*   **Baza Przestrzenna (PostGIS):** Jeśli projekty staną się bardzo duże (mapy kampusów), warto przejść na bazę wspierającą zapytania geograficzne/przestrzenne.
*   **Wersjonowanie (Event Sourcing):** Zamiast nadpisywać stan, zapisujemy historię zmian. Pozwala to na "Timeline" projektu — PM może zobaczyć, co działo się na budowie tydzień po tygodniu.

## 3. Zarządzanie Plikami i Mediami

### Stan Obecny (MVP)
*   Pliki (PDF, zdjęcia) przechowywane na dysku serwera (FileStorage).
*   Referencje w bazie danych po ID.

### Ewolucja (Enterprise)
*   **Object Storage (S3/Azure Blob):** Przeniesienie plików do chmury dla nieskończonej skalowalności i bezpieczeństwa (backupy, redundancja).
*   **Image Optimization Service:** Automatyczne generowanie miniatur zdjęć z budowy. Technik na wolnym łączu LTE nie musi pobierać 10MB zdjęcia w wysokiej rozdzielczości, by zobaczyć podgląd.
*   **CDN:** Szybsze serwowanie ciężkich podkładów PDF dla użytkowników w różnych lokalizacjach.

## 4. Współpraca w Czasie Rzeczywistym (Real-time Collaboration)

### Stan Obecny (MVP)
*   Zapis przez "Debounce" (PUT /projects/:id co kilka sekund).
*   Ryzyko nadpisania zmian (Race condition), gdy PM i Technik edytują ten sam projekt jednocześnie.

### Ewolucja (Enterprise)
*   **WebSockets:** Natychmiastowe propagowanie zmian między użytkownikami. Jeśli PM doda warstwę w biurze, Technik widzi ją na tablecie sekundę później.
*   **CRDT (Conflict-free Replicated Data Types):** Zaawansowana synchronizacja danych pozwalająca na bezkonfiktową edycję tego samego obiektu przez wiele osób jednocześnie (standard w narzędziach typu Figma/Miro).

## 5. Offline-First (Kluczowe dla budowy)

### Stan Obecny (MVP)
*   Aplikacja wymaga stałego połączenia do zapisu/odczytu zdjęć i stanów.

### Ewolucja (Enterprise)
*   **PWA (Progressive Web App):** Pełne keszowanie podkładów PDF i interfejsu.
*   **Background Sync:** Technik robi zdjęcia w piwnicy (brak zasięgu), aplikacja zapisuje je lokalnie (IndexedDB) i automatycznie synchronizuje z serwerem, gdy tylko pojawi się zasięg.

## Podsumowanie - Priorytety Rozwoju

1.  **Short-term (Quick Wins):** Przejście na relacyjną strukturę `objects` (aby umożliwić raporty) + wprowadzenie ról (PM/Tech).
2.  **Mid-term:** Migracja plików do S3 i optymalizacja zdjęć.
3.  **Long-term:** Real-time collaboration i zaawansowany tryb Offline.
