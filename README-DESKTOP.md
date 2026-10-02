# GymTracker Pro 2.24.0 — Windows x64

Autor: Pasik92. Interfejs React/Vite pochodzi z dostarczonego ZIP-a.

## Uruchomienie

- Instalator: `A:\PLAN-TRENINGOWY\release\GymTracker-Pro-Setup-x64.exe`
- Portable: `A:\PLAN-TRENINGOWY\release\GymTracker-Pro-Portable-x64.exe`
- Do uruchomienia gotowego EXE nie potrzeba Node, Python, terminala ani zewnętrznej przeglądarki.
- Dane obu wydań: `%LOCALAPPDATA%\GymTracker\workout_data.json`.
- Kopie: `%LOCALAPPDATA%\GymTracker\backups`; lista kopii w `backup-index.json`.
- Profil Chromium/localStorage: `%LOCALAPPDATA%\GymTracker\chromium`.
- Wersja portable używa tego samego katalogu danych użytkownika, a nie katalogu obok EXE.
- Zwykła aktualizacja i deinstalacja zachowują dane użytkownika.

## Dane ze starej wersji web

Wyeksportuj JSON w wersji web i zaimportuj go w Ustawieniach programu. Aplikacja desktop nie odczytuje prywatnego profilu Chrome ani danych z domeny AI Studio.
Jeśli dane ze starego localStorage istnieją w profilu desktop, migracja tworzy kopię przed zapisem pliku i zachowuje stare localStorage.
Import weryfikuje strukturę danych i tworzy kopię aktualnego stanu przed jego zastąpieniem.
Automatyczny zapis wyłączony: zmiany zapisują się przy normalnym zamknięciu; zamknięcie procesu siłą może je utracić.

## Budowanie

Z katalogu source uruchom `build-desktop.ps1` w PowerShell. Skrypt trzyma cache i pliki tymczasowe na A:.
Testy jednostkowe: `npm test`; TypeScript: `npm run lint`; renderer: `npm run build`.
Testy aplikacji: `node tests/desktop-smoke.cjs` (osobny katalog danych na A:).
Porównanie UI: `node tests/visual-compare.cjs`, przy działającym oryginalnym baseline na http://127.0.0.1:3000/.

## Referencja Python

`gym_tracker.py`, `build_exe.bat`, `requirements.txt` i widok Kod Pythona & EXE pozostają referencją. Główne wydanie Windows jest budowane przez Electron/electron-builder.

## Ograniczenia

- Status pełnego odbioru: PARTIAL; bieżące wyniki w `A:\PLAN-TRENINGOWY\reports\CURRENT-AUDIT-2.24.md` (starszy raport historyczny pozostaje w `FINAL-REPORT.md`).
- Ćwiczenia z ciężarem `0 kg` są obsługiwane poprawnie; regresja ciężaru zerowego jest częścią testów wydania.

- EXE nie ma podpisu certyfikatem wydawcy; Windows może wyświetlić ostrzeżenie o nieznanym wydawcy.
- Zachowano domyślną ikonę Electron.
- Pola ścieżek w oryginalnym UI pozostają informacyjne; obowiązują katalogi danych wskazane powyżej.
- Oryginał ma przyciski -2.5, +2.5, +5.0; -5 wykonuje się przez dwukrotne -2.5 lub wpisanie ciężaru.
- Zachowano oryginalne obliczenia i treści modułu cykli; testy nie są weryfikacją medyczną tych treści.
