# PROTECTED-CORE: Ściśle Chroniony Rdzeń Aplikacji GymTracker Pro v2.24.0

Niniejszy dokument definiuje infrastrukturę, typy danych, algorytmy oraz pliki będące **ŚCIŚLE CHRONIONYM RDZENIEM (PROTECTED CORE)**. Modyfikacja tych elementów bez wcześniejszego audytu i zgody jest surowo zabroniona.

---

## 1. Chroniony Model Danych i Typy (`src/types.ts`)
Wszystkie poniższe struktury oraz pole `GymData` są zamrożone:
- `GymData` (struktura główna document root)
- `Week` (tygodnie treningowe, pola `id`, `name`, `days`)
- `Day` (dni treningowe, pola `id`, `name`, `completed`, `exercises`, `notes`)
- `Exercise` (ćwiczenia, pola `id`, `name`, `sets`, `reps`, `weight`, `rpe`, `notes`, `history`, `loggedSets`)
- `SetLog` (logi serii, pola `setIndex`, `weight`, `reps`, `completed`, `rpe`)
- `BodyWeightEntry` (wpisy wagi, pola `id`, `date`, `weight`, `notes`)
- `BodyMeasurementEntry` (obwody, pola `id`, `date`, `part`, `side`, `valueMm`)
- `ProtocolEntry` (substancje, pola `id`, `date`, `substance`, `dosage`, `halfLifeHours`)
- `AppSettings` (ustawienia systemowe)

---

## 2. Chronione Pliki Logiki i Obliczeń
Niedopuszczalne jest usuwanie ani zmiana matematycznych wzorców obliczeniowych w plikach:
1. `src/utils/calculations.ts` — Kalkulator e1RM (wzór Brzyckiego/Epleya) oraz sumowanie tonażu i objętości.
2. `src/utils/circumference.ts` — Algorytmy wygładzania wykresów EMA ($\alpha=0.3$) oraz wyliczanie wskaźnika Z-Score dla wykrywania błędnych pomiarów.
3. `src/utils/bodyMeasurements.ts` — Przelicznik jednostek mm/cm oraz konwersja przecinków na kropki dziesiętne.
4. `src/utils/pharmacokinetics.ts` — Wzory wykładniczego rozpadu substancji i stężenia we krwi na podstawie okresu półtrwania.
5. `src/utils/analysis.ts` — Silnik analizy mezocykli, progresji siłowej oraz równowagi partii mięśniowych.

---

## 3. Chroniony System Zapisu, Kopii Zapasowych i IPC
Zabrania się modyfikowania mechanizmu utrwalania danych i bezpieczeństwa:
1. `desktop/storage.cjs` — Atomowy zapis plikowy (`fs.writeFileSync` do `.tmp`, zmiana nazwy, walidacja walidatorem JSON, obsługa katalogu `/backups`).
2. `src/utils/persistence.ts` — Menedżer zapisu przeglądarkowego i komunikacji z mostkiem `window.electronAPI`.
3. `desktop/main.cjs` & `desktop/preload.cjs` — Konfiguracja bezpieczeństwa renderer'a Electron (`contextIsolation: true`, `sandbox: true`).

---

## 4. Chroniony Backend Serwera (`server.ts`)
1. Wszelkie zmodyfikowane endpointy aktualizacji (`/api/update/check`, `/api/update/download/:version`, `/api/update/apply`, `/api/update/rollback`, `/api/update/history`) muszą pozostać w pełni wstecznie kompatybilne.
2. Middleware Vite i serwowanie pliku produkcyjnego `dist/index.html`.

---

## 5. Chronione Selektory HTML (`id`) Dla Testów E2E
Musi zostać zachowana ciągłość następujących identyfikatorów HTML używanych przez automatyczne testy regresyjne:
- **Nawigacja Sidebar**: `#sidebar-nav-plan`, `#sidebar-nav-stats`, `#sidebar-nav-muscle`, `#sidebar-nav-weight`, `#sidebar-nav-cycles`, `#sidebar-nav-exercises`, `#sidebar-nav-settings`, `#sidebar-nav-python`.
- **Plan Treningowy**: `#btn-add-week`, `#btn-duplicate-week`, `#btn-delete-week`, `#btn-add-day`, `#btn-finish-workout-day`, `#btn-header-add-exercise`, `#day-notes-textarea`, `#btn-toggle-day-notes`.
- **Karty Ćwiczeń**: `#exercise-card-{id}`, `#btn-edit-{id}`, `#btn-delete-{id}`, `#btn-history-{id}`, `#btn-plus-sets-{id}`, `#btn-plus-reps-{id}`, `#btn-save-performance-{id}`.
- **Formularze & Modale**: `#input-exercise-name`, `#input-exercise-sets`, `#input-exercise-reps`, `#input-exercise-weight`, `#select-exercise-rpe`, `#input-exercise-notes`, `#btn-submit-exercise-modal`, `#modal-history-window`.
- **Ustawienia & Bakupy**: `#btn-create-backup-now`, `#btn-export-json`, `#btn-reset-analysis-settings`, `#settings-diagnostics`, `#input-analysis-start-week`.
- **Waga & Pomiary**: `#input-bw-weight`, `#input-bw-notes`, `#btn-submit-bw`.
