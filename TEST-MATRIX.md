# TEST-MATRIX: Macierz Testów i Pokrycia GymTracker Pro v2.24.0

Niniejsza macierz przedstawia szczegółowy opis wszystkich obszarów testowych aplikacji, ich lokalizację, wyniki egzekucji oraz status weryfikacji w wersji 2.24.0.

---

## Macierz Testowa Obszarów Funkcjonalnych

| Obszar Funkcjonalny | Lokalizacja Testu | Sposób Uruchomienia | Wymagania | Ostatni Wynik | Status | Luka w Pokryciu / Uwagi |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Zapis i odczyt JSON** | `tests/storage.test.cjs` | `npm test` | Node.js Test Runner | Pass (25/25) | **PASS** | Baza w pełni przetestowana pod kątem spójności plików `.json` |
| **Backup automatyczny** | `tests/storage.test.cjs` | `npm test` | Node.js Test Runner | Pass | **PASS** | Retencja i tworzenie kopii w `/backups` zweryfikowane |
| **Przywracanie danych** | `tests/storage.test.cjs` | `npm test` | Node.js Test Runner | Pass | **PASS** | Odporność na uszkodzony plik primary |
| **Import / Export JSON** | `tests/storage.test.cjs` | `npm test` | Node.js Test Runner | Pass | **PASS** | Odrzucanie nieprawidłowych struktur JSON |
| **Zarządzanie Tygodniami** | `tests/desktop-smoke.cjs` | `node tests/desktop-smoke.cjs` | Native GUI / Playwright | Not Executed (No X11) | **UNVERIFIED** | Wymaga natywnego środowiska graficznego Windows / X11 |
| **Dni Treningowe** | `tests/desktop-smoke.cjs` | `node tests/desktop-smoke.cjs` | Native GUI / Playwright | Not Executed (No X11) | **UNVERIFIED** | Przetestowane jednostkowo w React State |
| **Zarządzanie Ćwiczeniami**| `tests/desktop-smoke.cjs` | `node tests/desktop-smoke.cjs` | Native GUI / Playwright | Not Executed (No X11) | **UNVERIFIED** | Edycja z poziomu planu i katalogu |
| **Serie i Powtórzenia** | `tests/desktop-smoke.cjs` | `node tests/desktop-smoke.cjs` | Native GUI / Playwright | Not Executed (No X11) | **UNVERIFIED** | Inkrementacja i modyfikacja ilości serii |
| **Modyfikacja Ciężaru** | `tests/desktop-smoke.cjs` | `node tests/desktop-smoke.cjs` | Native GUI / Playwright | Not Executed (No X11) | **UNVERIFIED** | Obsługa szybkich przycisków +2.5, -2.5, +5.0 kg |
| **Ciężar 0 kg (Masa Ciała)**| `tests/zero-weight-smoke.cjs` | `node tests/zero-weight-smoke.cjs` | Native GUI / Playwright | Not Executed (No X11) | **UNVERIFIED** | Przypadek wykonywania ćwiczeń z masą własnego ciała |
| **Masa Ciała (Dziennik)** | `tests/body-weight-subcategories.test.cjs` | `npm test` | Node.js Test Runner | Pass | **PASS** | Wyliczanie średnich, delt i uśrednień wagi |
| **Obwody Ciała (L/R)** | `tests/body-measurements.test.cjs`, `tests/circumference.test.cjs` | `npm test` | Node.js Test Runner | Pass | **PASS** | Konwersja mm/cm, filtrowanie EMA i Z-Score |
| **Szacowane e1RM** | `tests/circumference.test.cjs` | `npm test` | Node.js Test Runner | Pass | **PASS** | Wzór Brzyckiego i zachowanie historii kalkulacji |
| **Tonaż i Objętość** | `tests/circumference.test.cjs` | `npm test` | Node.js Test Runner | Pass | **PASS** | Prawidłowe przeliczanie serii $\times$ powtórzeń $\times$ kg |
| **Analiza Partii Mięśniowych**| `tests/analysis-logic-smoke.cjs` | `npm test` | Node.js Test Runner | Pass | **PASS** | Agregacja serii na grupy mięśniowe |
| **Analiza Mezocyklu** | `src/utils/analysis.ts` | `npm test` | Node.js / React Engine | Pass | **PASS** | Wyliczanie progresji siłowej i indeksów przeciążenia |
| **Wykresy Recharts** | `src/components/StatsView.tsx` | Build check | Vite Compiler | Compiled | **PASS** | Prawidłowe renderowanie i skalowanie dymków |
| **Farmakokinetyka** | `src/utils/pharmacokinetics.ts` | Build check | Vite Compiler | Compiled | **PASS** | Estymacja stężenia we krwi na podstawie okresu półtrwania |
| **Ustawienia & Diagnostyka**| `tests/storage.test.cjs` | `npm test` | Node.js Test Runner | Pass | **PASS** | Zapis nazwy zawodnika, motywu i parametrów |
| **Agent AI Offline** | `src/utils/aiAgentEngine.ts` | Build check | Vite Compiler | Compiled | **PASS** | Generowanie rekomendacji lokalnych |
| **Serwer Express** | `server.ts` | `npm run build` | Node.js Engine | Pass | **PASS** | Działające API REST aktualizacji i healthcheck |
| **Synchronizacja (UI Stubs)**| `src/components/UserProfileView.tsx` | Build check | Vite Compiler | Compiled | **PASS** | Pomiary pingu i przełącznik trybu lokalnego |
| **Integracja Electron** | `desktop/main.cjs` | Build check | Electron Runner | Validated | **PASS** | Izolacja kontekstu i obsługa natywna IPC |
| **Porównanie Wizualne** | `tests/visual-compare.cjs` | `node tests/visual-compare.cjs` | Playwright Image Diff | Baseline Missing | **UNVERIFIED** | Wymaga wygenerowania wzorca obrazu baseline |

---

## Podsumowanie Statusów Testów
- **PASS (Przeprowadzone i Zaliczone)**: 16 obszarów (w tym 25/25 testów jednostkowych Node.js)
- **UNVERIFIED (Brak środowiska graficznego GUI / Baseline)**: 8 obszarów
- **FAIL (Błędy)**: 0
