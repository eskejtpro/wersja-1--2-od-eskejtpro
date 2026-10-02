# TEST-MATRIX: Macierz Testów i Pokrycia PlanPasika.v2 (GymTracker Pro v3.0.2)

Niniejsza macierz przedstawia aktualny zakres i wyniki testów wersji 3.0.2. Testy opisujące warstwę `RoomDatabase` w TypeScript używają mockowanego localStorage i nie dowodzą działania natywnej Room SQLite. Pełny opis architektoniczny znajduje się w pliku `AGENT_MASTER_REPORT.md`.

---

## 📊 Podsumowanie Egzekucji Testów (Stan na v3.0.2)
- **Łączna liczba testów aplikacji**: 95 / 95 (**PASS - 100%**)
- **Testy serwera/OIDC**: 15 / 15 (**PASS - 100%**)
- **Testy UI Google i konfiguracji Androida**: 3 / 3 (**PASS - 100%**)
- **Kompilacja TypeScript i Linter**: `tsc --noEmit` (**PASS - 0 błędów**)
- **Web build / Capacitor sync / Android assembleDebug**: (**PASS**); APK debug `3.0.2` zbudowany, instalacja na urządzeniu **UNVERIFIED**
- **Błędy krytyczne**: 0 (**FAIL: 0**)

---

## 🧪 Macierz Pakietów Testowych

| Pakiet Testowy | Plik Testu | Liczba Testów | Sposób Uruchomienia | Status | Zakres Pokrycia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Magazyn Danych & Atomowość** | `tests/storage.test.cjs` | 13 | `npm test` | **PASS** | Atomowość zapisu, rotacja kopii zapasowych `/backups`, odrzucanie uszkodzonego JSON, fail-closed |
| **Logiczne partycje danych TypeScript** | `tests/room-database.test.cjs` | 1 | `npm test` | **PASS** | DAO-shape i partycje JSON w mockowanym localStorage; brak natywnego SQLite testu |
| **Migracja partycji lokalnych** | `tests/room-initialization-flow.test.cjs` | 1 | `npm test` | **PASS** | Mapowanie JSON do partycji logicznych, test w środowisku Node/mock |
| **Odzyskiwanie danych przy starcie** | `tests/startup-data-recovery.test.cjs` | 3 | `npm test` | **PASS** | Zachowanie istniejącej bazy przy braku partycji, priorytet partycji, brak fałszywych deklaracji SQL |
| **Procedura Migracyjna** | `tests/database-migration.test.cjs` | 4 | `npm test` | **PASS** | Walidacja sumy SHA256, nienaruszalność pierwotnego pliku przed migracją |
| **Mapery Domenowe** | `tests/domain-mappers.test.cjs` | 3 | `npm test` | **PASS** | Bezpieczna konwersja encji domenowych, typowanie i wartości domyślne |
| **Stoper Treningowy (Wall-Clock)** | `tests/workout-timer.test.cjs` | 1 | `npm test` | **PASS** | Odporność stopera na uśpienie karty, przełączanie okien i ubicie procesu Androida |
| **Pomiary Ciała & Obwody** | `tests/body-measurements.test.cjs` | 3 | `npm test` | **PASS** | Konwersja mm/cm, asymetria lewa/prawa strona, filtrowanie Z-score |
| **Obwody & Matematyka 1RM** | `tests/circumference.test.cjs` | 3 | `npm test` | **PASS** | Wzór Brzyckiego, szacowanie e1RM, kalkulacja tonażu bez dzielenia przez zero |
| **Dziennik Masy Ciała & Subkategorie**| `tests/body-weight-subcategories.test.cjs` | 3 | `npm test` | **PASS** | Średnie ważone, średnia krocząca EMA, podział na czczo / po treningu |
| **Pulpit Szybkiego Dostępu 3D** | `tests/quick-access-dashboard.test.cjs` | 10 | `npm test` | **PASS** | Kafelki Bento 3D, kalkulator talerzy na gryf 20kg, kalkulator 1RM (Brzycki & Epley), DnD |
| **Trener AI Gemini & Pamięć** | `tests/ai-coach-online.test.cjs` | 1 | `npm test` | **PASS** | Kaskada modeli Gemini 3.8 Flash -> Gemini 2.5 Flash -> Offline Knowledge Base |
| **Audyt Inteligentny Gemini** | `tests/gemini-pro-intelligent-audit.test.cjs` | 7 | `npm test` | **PASS** | Regresja liniowa OLS, ochrona przed brakiem wariancji, filtracja szumu |
| **Kompatybilność z Android APK** | `tests/android-apk-compatibility.test.cjs` | 3 | `npm test` | **PASS** | Konfiguracja Capacitor, routing i deklaracje uprawnień; nie zastępuje instalacji/runtime na urządzeniu |
| **Gęstość Kart UI** | `tests/card-density.test.cjs` | 1 | `npm test` | **PASS** | Tryby standardowy, kompaktowy oraz ultra-gęsty (dla małych ekranów) |
| **Baza Wiedzy Aplikacji** | `tests/app-knowledge-guide.test.cjs` | 1 | `npm test` | **PASS** | Integralność podręcznika metodycznego i podpowiedzi treningowych |
| **Kompletny Test Integracyjny E2E** | `tests/full-e2e-application-suite.test.cjs` | 10 | `npm test` | **PASS** | Pełna ścieżka: tworzenie planu, serie, waga, farmakokinetyka, eksport |
| **Tryb Pełnej Mocy & Rampa Rozgrzewki**| `tests/turbo-power-features.test.cjs` | 3 | `npm test` | **PASS** | Rampa rozgrzewki Smart Warm-up, progresja przeciążenia +2.5kg, typy gryfów |
| **Rozszerzona Analityka & Kalendarz** | `tests/enhanced-analysis-calendar.test.cjs` | 4 | `npm test` | **PASS** | Wskaźnik ACWR, intensywność na powtórzenie, 4 wzory 1RM, korelacja kalendarza |
| **Autonomiczne Akcje Wykonawcze AI** | `tests/ai-agent-autonomous-actions.test.cjs` | 4 | `npm test` | **PASS** | Parsowanie intencji NLP, instalator planu, aplikowanie progresji +2.5kg |
| **Autonomiczny Agent AI Pełnej Mocy** | `tests/ai-autonomous-features.test.cjs` | 6 | `npm test` | **PASS** | Multi-action batch JSON, deload -40%/-10%, makro, modyfikacje i usuwanie ćwiczeń |
| **Serwer Google Cloud & Auth** | `tests/server.test.cjs` | 11 | `npm run test:server` | **PASS** | REST API `/api/*`, logowanie lokalne, sesje Bearer, CORS i rate limit |
| **Google ID Token/OIDC** | `tests/google-id-token.test.cjs` | 4 | `npm run test:server` | **PASS** | Podpis, audience, issuer, expiry, izolacja principal i blokada Cloud Run |
| **Google UI bez fake success** | `tests/google-ui-no-fakes.test.cjs` | 3 | `npm run test:google-ui` | **PASS** | ID token, sesja tylko w pamięci, brak fake identity i Android cleartext/mixed content |

---

## 🛠️ Instrukcja dla Przyszłych Agentów AI:
1. Przed oddaniem jakiejkolwiek zmiany uruchom:
   ```bash
   npm test && npm run test:server && npm run lint
   ```
2. Jeśli dodałeś nowy moduł, stwórz dla niego test w katalogu `tests/` i dopisz go do `package.json` oraz do niniejszej macierzy.
3. Szczegółowe wytyczne architektoniczne opisano w `AGENT_MASTER_REPORT.md`.
