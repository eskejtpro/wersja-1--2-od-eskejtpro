# HANDOFF-AI-STUDIO: GymTracker Pro v2.24.0

## 1. Informacje Podstawowe
- **Nazwa Aplikacji**: GymTracker Pro
- **Wersja**: 2.24.0 (Zamrożona wersja bazowa / Release Candidate)
- **Autor**: Pasik92
- **Środowisko docelowe**: Windows 10/11 64-bit (Electron Native & Standalone Web/Node)
- **Stos technologiczny**: React 18, TypeScript, Tailwind CSS, Vite, Express, Electron, Node.js Test Runner

## 2. Cel Programu
GymTracker Pro to kompleksowa, zaawansowana aplikacja do śledzenia treningów siłowych, analizy progresji objętości i tonażu, wyliczania szacowanego ciężaru maksymalnego (e1RM), śledzenia składu ciała i obwodów mięśniowych z filtrowaniem statystycznym (EMA / Z-Score), rejestrowania protokołów suplementacyjnych i farmakokinetyki oraz generowania zaawansowanych raportów mezocykli.

## 3. Sposób Uruchomienia
- **Tryb Deweloperski (Web / Express + Vite)**:
  ```bash
  npm run dev
  ```
  Otwiera serwer na `http://localhost:3000`.

- **Tryb Natywny Electron**:
  ```bash
  npm start
  ```
  Uruchamia natywne okno desktopowe Windows z wykorzystaniem `desktop/main.cjs`.

- **Uruchomienie Testów Jednostkowych**:
  ```bash
  npm test
  ```

- **Weryfikacja Typów i Lintera**:
  ```bash
  npm run lint
  ```

## 4. Sposób Budowania
- **Kompilacja Aplikacji Web/Express**:
  ```bash
  npm run build
  ```
  Generuje zestaw plików produkcyjnych w katalogu `dist/` oraz skompilowany serwer `dist/server.cjs`.

- **Pakowanie do Wykonywalnej Aplikacji Windows (.exe)**:
  Użyj dostarczonego skryptu Batch lub PowerShell:
  ```cmd
  build_exe.bat
  ```
  lub
  ```powershell
  .\build-desktop.ps1
  ```

## 5. Główne Ekrany Aplikacji
1. **Plan Treningowy (`view-workout-plan`)**: Zgodny z układem tygodni i dni, obsługa kalkulatorów +2.5 / -2.5 / +5.0 kg, RPE, notatek i historii ćwiczeń.
2. **Statystyki & Tonaż (`view-stats`)**: Analityka serii, tonażu skumulowanego, wykresy e1RM oraz podsumowania okresowe.
3. **Rozkład Partii Mięśniowych (`muscle-progress-view`)**: Wizualizacja zaangażowania grup mięśniowych i objętości przeliczeniowej.
4. **Waga & Obwody Ciała (`view-body-weight`)**: Dedykowane rejestry masy ciała, pomiarów obwodów z podziałem na strony L/R oraz filtrowanie EMA i Z-Score.
5. **Protokoły Cykli (`cycle-protocol-view`)**: Dziennik substancji, estymacja okresu półtrwania i stężenia we krwi.
6. **Baza Ćwiczeń (`view-exercise-manager`)**: Globalny katalog ćwiczeń z możliwością edycji i usuwania bez naruszania struktury planu.
7. **Kod Python (`view-python-code`)**: Generowanie i podgląd kodu źródłowego Python dla zaawansowanych analityków.
8. **Ustawienia & Profil (`view-settings`, `profile`)**: Diagnostyka integralności danych, kopie zapasowe, rejestry wydań oraz parametry zawodnika.

## 6. Opis Modelu Danych (`GymData`)
Główna struktura danych opisana jest w `/src/types.ts` i opiera się na obiekcie root `GymData`:
- `weeks: Week[]` — Tygodnie treningowe zawierające dni (`Day[]`), które składają się z ćwiczeń (`Exercise[]`).
- `exercises: Exercise[]` — Obiekty ćwiczeń z nazwami, seriami, powtórzeniami, ciężarem, notatkami, parametrem RPE oraz dwiema tablicami historii (`history` i `loggedSets`).
- `bodyWeights: BodyWeightEntry[]` — Pomiary masy ciała z datą, wagą i notatką.
- `circumferences: BodyMeasurementEntry[]` — Pomiary obwodów partii ciała (mm) z datą, wartością i podziałem na stronę lewą/prawą.
- `protocolEntries: ProtocolEntry[]` — Rejestr przyjmowanych substancji i dawek do wyliczeń farmakokinetyki.
- `settings: AppSettings` — Konfiguracja motywu, zakresów analizy, profilu zawodnika, wersji i integracji.

## 7. Opis Lokalnego Zapisu i Kopii Zapasowych
- **Zapis Główny**: Przechowywany w pliku `workout_data.json` zarządzanym przez natywny moduł `desktop/storage.cjs`. Zapis wykorzystuje bezpieczny zapis atomowy (zapis do `.tmp` -> zamiana plików).
- **Automatyczne Bakupy**: Tworzone automatycznie w katalogu `backups/` z unikalną sygnaturą czasową. Retencja zachowuje bezpieczny zapas kopii i chroni pliki przed uszkodzeniem.

## 8. Architektura Electron (`desktop/`)
- `desktop/main.cjs` — Główny proces Electron z włączoną izolacją kontekstu (`contextIsolation: true`) i piaskownicą renderera (`sandbox: true`).
- `desktop/preload.cjs` — Zabezpieczony mostek IPC udostępniający wyłącznie bezpieczne metody plikowe i okienkowe (`window.electronAPI`).
- `desktop/prompt.html` & `desktop/prompt-preload.cjs` — Natywne okienko do bezbłędnego wprowadzania nazw (np. zmiana nazwy tygodnia).

## 9. Opis Serwera (`server.ts`)
Serwer Express w `server.ts` oferuje:
- Integrację deweloperską z middleware Vite SPA.
- Serwowanie zasobów statycznych w trybie produkcji (`dist/`).
- Endpointy serwerowej aktualizacji aplikacji: `/api/update/check`, `/api/update/download/:version`, `/api/update/apply`, `/api/update/rollback`, `/api/update/history`.

## 10. Znane Ograniczenia
- Testy GUI z użyciem Playwright Electron wymagają natywnej sesji graficznej (Windows / X11) i w środowiskach kontenerowych zwracają status `UNVERIFIED`.
- Brak produkcyjnego połączenia z zewnętrzną chmurą p2p (wszystkie dane są w 100% lokalne i suwerenne).

## 11. Zasady Bezpieczeństwa & Rzeczy Chronione (STRICT PROHIBITED)
- **NIE WOLNO** zmieniać struktury interfejsu ani usuwać istniejących funkcji.
- **NIE WOLNO** modyfikować selektorów testowych (`id="..."`).
- **NIE WOLNO** przemieszczać ani usuwać wzorców wyliczeń tonażu, e1RM oraz obwodów.
- **NIE WOLNO** usuwać bezpiecznych procedur zapisu w `desktop/storage.cjs` ani `src/utils/persistence.ts`.
