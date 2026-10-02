# PROJECT-MANIFEST: Mapowanie Struktury GymTracker Pro v2.24.0

## 1. Katalogi Główne
- `/src` — Kod źródłowy aplikacji klienckiej React + TypeScript.
- `/src/components` — Komponenty interfejsu użytkownika UI.
- `/src/data` — Dane domyślne, katalog ćwiczeń i źródła statyczne.
- `/src/utils` — Silniki przeliczeniowe, analiza, farmakokinetyka, utrwalanie danych.
- `/desktop` — Moduły natywne Electrona (Main Process, Preload, Storage, IPC).
- `/tests` — Testy jednostkowe, integracyjne i skrypty weryfikacji.

## 2. Pliki Konfiguracyjne i Budowania
- `/package.json` — Definicja zależności, skryptów uruchomieniowych (`dev`, `build`, `start`, `test`, `lint`).
- `/tsconfig.json` — Konfiguracja kompilatora TypeScript dla React + Node.
- `/vite.config.ts` — Konfiguracja narzędzia Vite dla trybu deweloperskiego i bundlera.
- `/build_exe.bat` — Skrypt wsadowy budowania natywnego pliku wykonywalnego Windows EXE.
- `/build-desktop.ps1` — Skrypt PowerShell automatyzujący pakowanie środowiska desktopowego.
- `/server.ts` — Glówny serwer Express.js i zintegrowane API aktualizacji.

## 3. Pliki Interfejsu Użytkownika (UI Components)
- `src/App.tsx` — Główny kontener aplikacji, router widoków, obsługa stanu globalnego.
- `src/components/ModernSidebar.tsx` — Pasek nawigacyjny z podkategoriami i profilem zawodnika.
- `src/components/ModernHeader.tsx` — Górny pasek informacyjny ze wskaźnikiem wersji i skrótami.
- `src/components/TitleBar.tsx` / `WindowsTitleBar.tsx` — Natywny pasek tytułowy okna Windows.
- `src/components/WorkoutPlanView.tsx` — Główny widok planu treningowego, edycja dni i serii.
- `src/components/StatsView.tsx` — Analityka tonażu, objętości i szacowanego e1RM.
- `src/components/MuscleProgressView.tsx` — Wizualny rozkład serii na partie mięśniowe.
- `src/components/BodyWeightView.tsx` — Dziennik wagi, rejestr obwodów i kalkulatory.
- `src/components/CircumferenceProgressPanel.tsx` — Podgląd postępów obwodów mięśniowych.
- `src/components/BodyPartMeasurementsPanel.tsx` — Dedykowany moduł wprowadzania pomiarów L/R.
- `src/components/CycleProtocolView.tsx` — Dziennik substancji i stężenia farmakokinetycznego.
- `src/components/ExerciseManagerView.tsx` — Baza i katalog ćwiczeń.
- `src/components/PythonCodeView.tsx` — Podgląd skryptów analitycznych Python.
- `src/components/SettingsView.tsx` — Ustawienia, diagnostyka i zarządzanie kopiami zapasowymi.
- `src/components/UserProfileView.tsx` — Profil zawodnika, cele i parametry.
- `src/components/AppUpdateServerPanel.tsx` — Serwerowy panel aktualizacji i wydań.
- `src/components/AppIntegrityDiagnosticRunner.tsx` — Diagnostyka spójności i integralności danych.

## 4. Pliki Logiki i Obliczeń (Logic & Engine)
- `src/utils/calculations.ts` — Kalkulator e1RM, tonażu i objętości.
- `src/utils/analysis.ts` — Analityka mezocykli, progresji i rozkładu partii.
- `src/utils/circumference.ts` — Algorytmy EMA i Z-Score dla obwodów mięśniowych.
- `src/utils/bodyMeasurements.ts` — Parsowanie i przeliczanie mm/cm pomiarów obwodów.
- `src/utils/pharmacokinetics.ts` — Estymacja okresów półtrwania i stężeń we krwi.
- `src/utils/persistence.ts` — Menedżer zapisu lokalnego i obsługi mostka IPC Electron.
- `src/utils/appUpdateService.ts` — Serwis komunikacji z API aktualizacji w `server.ts`.
- `src/utils/aiAgentEngine.ts` — Lokalny silnik generowania porad i rekomendacji treningowych.

## 5. Pliki Danych i Typów
- `src/types.ts` — Pełna definicja typów TypeScript (`GymData`, `Week`, `Day`, `Exercise`, etc.).
- `src/data/initialData.ts` — Domyślny zestaw danych startowych dla nowej instalacji.
- `src/data/defaultCatalogExercises.ts` — Standardowy katalog ćwiczeń.
- `src/data/pythonSource.ts` — Kod źródłowy osadzonego skryptu Python.

## 6. Pliki Natywne Electron (`desktop/`)
- `desktop/main.cjs` — Główny proces zarządcy okien Windows.
- `desktop/preload.cjs` — Bezpieczny mostek IPC między procesem głównym a rendererem.
- `desktop/storage.cjs` — Natywna obsługa operacji na systemie plików Windows (`fs`).
- `desktop/prompt.html` & `prompt-preload.cjs` — Modalne okienko wprowadzania tekstów.

## 7. Pliki Testów (`tests/`)
- `tests/storage.test.cjs` — Testy jednostkowe zapisu, odczytu, migracji i backupów.
- `tests/circumference.test.cjs` — Testy algorytmów EMA i Z-Score obwodów.
- `tests/body-measurements.test.cjs` — Testy przeliczania i walidacji pomiarów ciała.
- `tests/body-weight-subcategories.test.cjs` — Testy kalkulacji wagi i trasowania podkategorii.
- `tests/desktop-smoke.cjs` — Test e2e Playwright dla interfejsu Electron.
- `tests/visual-compare.cjs` — Test porównania wizualnego z baseline.
