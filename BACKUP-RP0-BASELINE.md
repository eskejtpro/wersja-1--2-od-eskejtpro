# RESTORE POINT 0 (RP-0): BASELINE AUDIT & DATA INTEGRITY SNAPSHOT

- **Data utworzenia**: 2026-10-01
- **Wersja źródłowa**: 2.24.0 (GymTracker Pro / PlanPasika)
- **Status testów jednostkowych**: 25/25 PASSED (node --test)
- **Status kompilacji**: SUCCESS
- **Cel**: Zamrożenie i zabezpieczenie stanu pierwotnego przed refaktoryzacją do architektury Android (Xiaomi 14T).

## 1. Zabezpieczone Kluczowe Pliki Logiki Biznesowej:
- `src/types.ts`: Pełna definicja typów (TrainingWeek, TrainingDay, Exercise, LoggedSet, BodyWeightEntry, CircumferenceEntry, BodyPartMeasurement, AppSettings, ProtocolEntry, UserProfile, CatalogExercise).
- `src/data/initialData.ts`: Pierwotny stan bazowy treningów, tygodni, dni, wagi i obwodów referencyjnych.
- `src/data/defaultCatalogExercises.ts`: Baza wzorcowa ćwiczeń (100+ pozycji z podziałem na partie).
- `src/utils/calculations.ts`: Wzory e1RM (Brzycki, Epley, Mayhew), tonaż, formatowanie dat.
- `src/utils/circumference.ts`: Filtrowanie EMA (alpha 0.3) oraz test Z-Score dla wykrywania anomalii pomiarów sylwetki.
- `src/utils/analysis.ts`: Analityka mezocykli, porównania okresowe, wskaźniki regularności i detekcja stagnacji.
- `src/utils/pharmacokinetics.ts`: Model farmakokinetyki (obliczanie stężeń we krwi i okresów półtrwania dawek).
- `src/utils/bodyMeasurements.ts`: Obliczenia metryk wagi i podkategorii.

## 2. Suma Kontrolna i Zestawienie Danych Referencyjnych:
- Liczba tygodni w `initialData`: 8
- Domyślna liczba ćwiczeń w katalogu: 104
- Podział partii: klatka, plecy, barki, nogi, biceps, triceps
- Klucz storage: `gymtracker_windows_data_v1`
- Klucz kopii automatycznych: `gymtracker_autobackups_v1`

## 3. Lista elementów przeznaczonych do usunięcia w Etapie 2.25.2:
- `desktop/` (main.cjs, preload.cjs, prompt-preload.cjs, prompt.html, storage.cjs)
- `gym_tracker.py`
- `requirements.txt`
- `build_exe.bat`, `build-desktop.ps1`, `start-server.bat`, `monitor-server.bat`, `monitor-server.ps1`
- `src/data/pythonSource.ts`
- `src/components/PythonCodeView.tsx`
- `src/components/WindowsTitleBar.tsx`
- `src/components/HoverAnnotationSystem.tsx`
