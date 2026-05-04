347 452 4029# Conversation Log — TASK-67B1F8

**Task:** przeanalizuj czy mechanizm rol dziala w dobry sposob, czy rola TECH rzeczywiscie nie moze nic edytowac i ma tylko okno do podgladu, bez mozliwosci przesuwania obiekto lub zmiany labels, oraz ze rola ADMIN na mozliwosc zarzadznia uprawnieniami uzytkownikow

**Roles:** architect=Gemini, developer=Gemini, reviewer=Gemini

---

## ARCHITECTING — 2026-05-04 16:17:44

### Gemini (Architekt)

**Summary:** Analiza wykazała, że mechanizm ról jest w większości poprawnie zaimplementowany po stronie serwera i w kluczowych elementach UI, jednak istnieją luki pozwalające roli TECH na edycję poprzez skróty klawiszowe oraz w interfejsie mobilnym. Plan zakłada uszczelnienie tych braków.

**Plan:**
1. **Zabezpieczenie skrótów klawiszowych w Canvas.tsx** — Dodanie sprawdzenia `isTech` wewnątrz `handleKeyDown` w komponencie `Canvas.tsx`, aby zablokować usuwanie obiektów (Delete/Backspace) oraz kopiowanie i wklejanie (Ctrl+C/V) dla użytkowników z rolą TECH. `[MODIFY]`
2. **Blokada edycji w MobileBottomBar.tsx** — Wyłączenie pola wprowadzania nazwy obiektu (`Input`) oraz przycisków zmiany statusu dla roli TECH w komponencie `MobileBottomBar.tsx`. `[MODIFY]`
3. **Blokada dodawania obiektów w MobileAddObjectPanel.tsx** — Ukrycie sekcji 'Add Object' oraz 'Target Layer' dla roli TECH w komponencie `MobileAddObjectPanel.tsx`, aby uniemożliwić dodawanie nowych elementów na plan w widoku mobilnym. `[MODIFY]`
4. **Ukrycie akcji zarządzania projektami w PDFUploader.tsx** — Ukrycie przycisków 'New Project', 'Share', 'Delete' oraz opcji importu dla roli TECH na liście projektów w `PDFUploader.tsx`. `[MODIFY]`

**Acceptance Criteria:**
- `[c1]` Użytkownik z rolą TECH nie może usunąć obiektu klawiszem Delete ani Backspace.  
  *Verify:* Weryfikacja kodu w Canvas.tsx: funkcja handleKeyDown musi zawierać warunek `if (isTech) return` przed dispatch('DELETE_OBJECTS').
- `[c2]` Użytkownik z rolą TECH nie może kopiować ani wklejać obiektów skrótami klawiszowymi.  
  *Verify:* Weryfikacja kodu w Canvas.tsx: obsługa Ctrl+C/V musi być zablokowana dla TECH.
- `[c3]` W widoku mobilnym pole edycji nazwy obiektu jest wyłączone (disabled) dla TECH.  
  *Verify:* Weryfikacja kodu w MobileBottomBar.tsx: Input musi posiadać atrybut `disabled={isTech}`.
- `[c4]` W widoku mobilnym przyciski zmiany statusu są wyłączone dla TECH.  
  *Verify:* Weryfikacja kodu w MobileBottomBar.tsx: przyciski statusu muszą posiadać atrybut `disabled={isTech}`.
- `[c5]` Sekcja dodawania obiektów w panelu mobilnym jest niewidoczna dla TECH.  
  *Verify:* Weryfikacja kodu w MobileAddObjectPanel.tsx: sekcja renderująca przyciski dodawania musi być warunkowo ukryta `{!isTech && ...}`.
- `[c6]` Na ekranie startowym (PDFUploader) przyciski New Project, Share i Delete są niewidoczne dla TECH.  
  *Verify:* Weryfikacja kodu w PDFUploader.tsx: przyciski te muszą być owinięte w `!isTech && ...`.
- `[c7]` ADMIN posiada wgląd do listy wszystkich użytkowników i może zmieniać ich role.  
  *Verify:* Weryfikacja istnienia AdminPage.tsx oraz endpointów /api/admin/users w server/routes.ts.

**Risks:**
- Możliwość ominięcia blokad UI przez bezpośrednie zapytania API (choć serwer posiada własne zabezpieczenia requireRole).
- Stale dane w cache'u przeglądarki po zmianie roli (użytkownik może musieć odświeżyć stronę).

---

