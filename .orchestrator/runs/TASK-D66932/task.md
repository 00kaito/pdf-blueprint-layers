# Task: TASK-D66932

## Title: progress tracking:

Tytuł zadania (Jira Summary):
[FE/BE] Implementacja systemu śledzenia postępu prac (Progress Tracking) - Model oparty na zaufaniu

  ---

Opis (Description):
Cel:
Rozszerzenie funkcjonalności edytora blueprintów o możliwość raportowania postępu prac instalacyjnych przez techników oraz wizualizację tego postępu dla Project Managerów. System ma działać w modelu "Trust-based" (brak twardych uprawnień na start, identyfikacja użytkownika poprzez podpis
lokalny).

Kontekst biznesowy:
Technicy w terenie muszą mieć możliwość szybkiego oznaczenia, czy dany punkt (gniazdo, kamera, AP) został już okablowany, zamontowany czy przetestowany. PM musi widzieć zagregowany status całego piętra/budynku bez konieczności sprawdzania każdego punktu z osobna.

  ---

Szczegóły implementacji (Scope):

1. Rozszerzenie Modelu Danych (Data Model):
   Należy rozszerzyć typ EditorObject o następujące pola:
* status: (PLANNED | CABLE_PULLED | TERMINATED | TESTED | APPROVED | ISSUE) - domyślnie PLANNED.
* statusUpdatedAt: Data ISO ostatniej zmiany.
* statusUpdatedBy: Imię/ID osoby dokonującej zmiany.
* issueDescription: Pole tekstowe (wymagane tylko dla statusu ISSUE).

2. Warstwa Wizualna (Visual Feedback):
   Ikony na planie muszą zmieniać kolor w zależności od status:
* ⚪ PLANNED: Szary (Domyślny)
* 🟡 CABLE_PULLED: Żółty
* 🔵 TERMINATED: Niebieski
* 🟢 TESTED: Jasnozielony
* ✅ APPROVED: Ciemnozielony
* 🔴 ISSUE: Czerwony

3. Interfejs Użytkownika (UI):
* Identyfikacja: Przy pierwszym uruchomieniu aplikacji (jeśli brak danych w localStorage), wyświetlić prosty modal z prośbą o wpisanie imienia/inicjałów technika.
* Properties Panel: Dodać sekcję "Status Wykonania" z wygodnymi przyciskami (Mobile-friendly) do zmiany statusu wybranego obiektu.
* Status Dashboard: Dodać widget (np. w pasku bocznym lub górnym) pokazujący statystyki:
    * Suma punktów: X
    * Ukończone (Tested/Approved): Y (Z%)
    * Problemy (Issues): W

  ---

Kryteria Akceptacji (Acceptance Criteria):
1. [ ] Każdy nowy obiekt dodany do planu ma domyślny status PLANNED.
2. [ ] Zmiana statusu obiektu w panelu bocznym natychmiast zmienia jego kolor na rzucie PDF.
3. [ ] Wybranie statusu ISSUE otwiera pole tekstowe do wpisania opisu usterki.
4. [ ] Każda zmiana statusu zapisuje aktualną datę oraz podpis użytkownika w metadanych obiektu.
5. [ ] Statystyki postępu (procent ukończenia) aktualizują się automatycznie po zmianie statusu dowolnego obiektu.
6. [ ] Informacje o statusach są poprawnie zapisywane i odczytywane podczas eksportu/importu projektu.

  ---

Notatki techniczne (Technical Notes):
* Frontend: React + Context API/Redux (aktualizacja EditorState).
* Storage: Na tym etapie dane zapisujemy w istniejącej strukturze JSON projektu (Trust-based).
* Ikonografia: Wykorzystać istniejące komponenty z icon-shapes.ts, dodając obsługę propa color zależnego od statusu.

  ---

Sub-taski (opcjonalnie):
1. [TS] Aktualizacja definicji typów w types.ts i schema.ts.
2. [UI] Implementacja modala "User Identification" (localStorage).
3. [UI] Dodanie sekcji zarządzania statusem w PropertiesPanel.tsx.
4. [Canvas] Implementacja logiki kolorowania ikon na podstawie statusu.
5. [UI] Stworzenie widgetu statystyk postępu prac.
