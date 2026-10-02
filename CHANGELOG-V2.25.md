# RAPORT Z WYKONANIA ETAPU 2.25.1 ORAZ 2.25.2

## 1. Zrealizowany zakres
- **Punkt przywracania RP-0**: Utworzono `BACKUP-RP0-BASELINE.md` z zamrożeniem stanu wyjściowego, sum kontrolnych i modeli domenowych.
- **Usunięcie balastu desktopowego**:
  - Usunięto skrypty i pliki Windows: `gym_tracker.py`, `requirements.txt`, `build_exe.bat`, `build-desktop.ps1`, `start-server.bat`, `monitor-server.bat`, `monitor-server.ps1`.
  - Usunięto desktopowe komponenty UI: `src/components/PythonCodeView.tsx`, `src/components/WindowsTitleBar.tsx`, `src/components/HoverAnnotationSystem.tsx`, `src/components/TitleBar.tsx`.
  - Usunięto plik `src/data/pythonSource.ts`.
  - Oczyszczono `src/App.tsx`, `src/components/SettingsView.tsx` oraz `src/components/ModernHeader.tsx` z martwych sekcji, importów i odwołań do Pythona.
  - Zsynchronizowano `metadata.json`, `index.html` oraz `package.json` do nazwy i wersji **PlanPasika.v2 (v2.25.0)**.
  - Wyodrębniono moduł `desktop/storage.cjs` jako czysty silnik zapisu Node/CJS wspierający testy integralności.

## 2. Wyniki weryfikacji i testów
- **Linter TypeScript (`npm run lint` / `tsc --noEmit`)**: 0 błędów (PASSED).
- **Kompilacja (`compile_applet`)**: SUCCESS.
- **Testy jednostkowe (`npm test`)**: 25/25 testów zaliczonych (100% PASSED).
- **Bezpieczeństwo danych**: Wszystkie modele domenowe (`types.ts`), dane treningowe (`initialData.ts`) i katalog ćwiczeń (`defaultCatalogExercises.ts`) nienaruszone.

## 3. Aktualny status w tabeli projektu
| Etap | Opis | Priorytet | Status | Postęp | Ryzyko | Blokery |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **2.25.1** | Kopia zapasowa & Baseline Audit | **P0** | **GOTOWE** | 100% | NISKIE | Brak |
| **2.25.2** | Usunięcie kodu desktopowego/Python | **P1** | **GOTOWE** | 100% | NISKIE | Brak |
| **2.25.3** | Standaryzacja modeli domenowych | **P0** | **GOTOWE** | 100% | NISKIE | Brak |
| **3.0** | Architektura bazy Room/SQLite & Migracja | **P0** | **DO REALIZACJI** | 0% | WYSOKIE | Czeka na akceptację |
| **3.1** | Ergonomia Android, M3 & Dolna Nawigacja | **P0** | NIE ROZPOCZĘTO | 0% | ŚREDNIE | Zależne od 3.0 |
