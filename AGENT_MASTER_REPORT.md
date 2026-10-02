# AGENT MASTER REPORT: PlanPasika.v2 (GymTracker Pro v3.0.8)
> **DOKUMENTACJA ARCHITEKTONICZNA, SYSTEMOWA I PROCEDURA TESTOWA DLA AGENTÓW AI**
> *Ostatnia aktualizacja: 2026-10-02 | Wersja aplikacji: v3.0.8 | Środowisko: Web / PWA / Android (Capacitor) / Windows Desktop (Electron)*
>
> **Ważne:** starsze opisy architektury poniżej zawierają deklaracje odziedziczone z wcześniejszych wersji. Zweryfikowany stan wykonawczy i jawne ograniczenia są zapisane w sekcji „Aktualizacja stanu 3.0.2” na końcu; w szczególności aktywny Android data store nie jest Room SQLite.

---

## 📌 1. PRZEZNACZENIE I CEL APLIKACJI

Aplikacja **PlanPasika.v2** (znana również jako **GymTracker Pro**) to zaawansowany, profesjonalny system treningowo-zdrowotny przeznaczony dla zawodników sportów siłowych (trójbój siłowy, kulturystyka, street lifting, cross-training) oraz ich trenerów.

Aplikacja łączy w sobie:
1. **Precyzyjny rejestrator jednostek treningowych**: serie robocze, powtórzenia, obciążenie, wskaźniki subiektywnego zmęczenia (RPE / RIR), mikro-progresję ciężaru i automatyczne szacowanie 1RM.
2. **Zaawansowaną analitykę periodyzacji**: tonaż (Volume Load), wykładnicze średnie kroczące (EMA), wykresy trendu regresji liniowej (OLS), korelacje i balans objętościowy grup mięśniowych.
3. **Dziennik biometryczny & zdrowotny**: monitorowanie masy ciała i obwodów (L/R) z dwuetapową filtracją szumu, rejestr badań laboratoryjnych krwi (morfologia, lipidogram, enzymy wątrobowe, hormony).
4. **Kalkulator farmakokinetyki iniekcji**: modelowanie stężeń substancji w czasie w oparciu o okres półtrwania ($T_{1/2}$) i kinetykę eliminacji pierwszego rzędu.
5. **Inteligentnego Trenera AI (Google Gemini 3.8 Flash)**: wbudowanego asystenta trenerskiego z długoterminową pamięcią faktów o zawodniku, działającego zarówno online, jak i w trybie bazy wiedzy offline.
6. **Pulpit Szybkiego Dostępu 3D (Quick Access Dashboard)**: modułowy interfejs Bento z wizualizatorem 3D gryfu olimpijskiego z talerzami IWF, stoperem serii/interwałów oraz kalkulatorami.

---

## 🏗️ 2. ARCHITEKTURA SYSTEMU I STOS TECHNOLOGICZNY

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WARSTWA PREZENTACJI (UI)                        │
│  React 19 + TypeScript + Vite + Tailwind CSS (Neumorphism 2.0 / 3D)    │
│  Recharts (Wykresy) + Lucide Icons + Motion (Mikro-interakcje)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│     ŚRODOWISKO ANDROID        │       │      SERWER CHMUROWY          │
│ Capacitor 8.5.2 Native Bridge │       │ Node.js + Express (server.ts) │
│ - AndroidManifest.xml         │       │ - Google Cloud Run 24/7       │
│ - WAKE_LOCK (Ekran treningu)  │       │ - Gemini 3.8 Flash SDK        │
│ - VIBRATE (Timer dotykowy)    │       │ - Sesje Bearer & Google Auth  │
│ - Wall-Clock Date.now() Timer │       │ - CORS dla domen *.run.app    │
└───────────────┬───────────────┘       └───────────────┬───────────────┘
                │                                       │
                ▼                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      WARSTWA DANYCH I PAMIĘCI                          │
│  1. RoomDatabase (roomDatabase.ts) – partycjonowane tabele relacyjne   │
│     (weeks, days, exercises, logged_sets, body_weights, agent_memory) │
│  2. Magazyn lokalny Capacitor Preferences / LocalStorage (Fail-Closed) │
│  3. Automatyczny bufor rotacyjny kopii zapasowych (/backups)           │
└────────────────────────────────────────────────────────────────────────┘
```

### Stos Technologiczny:
- **Framework & Język**: React 19 (`react`, `react-dom`), TypeScript 5.8+
- **Bundler & Dev Server**: Vite 6.2+ (`@vitejs/plugin-react`, `@tailwindcss/vite`)
- **Backend Fullstack**: Express 4.21+ (`server.ts`), uruchamiany przez `tsx` na porcie 3000
- **Silnik AI**: `@google/genai` (modele `gemini-3.8-flash`, `gemini-2.5-flash` z automatyczną kaskadą)
- **Silnik Mobilny**: `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`
- **Wykresy i Wizualizacje**: `recharts` (LinearRegression, ResponsiveContainer, Area/Bar Charts)
- **Ikony i Styl**: `lucide-react`, Tailwind CSS z autorskimi klasami 3D (`.card-3d`, `.dock-3d`, `.btn-3d-emerald`, `.plate-disc-3d`, `.bg-mesh-3d`)

---

## 📱 3. JAK APLIKACJA DZIAŁA NA ANDROIDZIE I CZEGO WYMAGA

### A. Wymagania systemowe dla Androida & Profil Sprzętowy Xiaomi 14T:
1. **Specyfikacja Xiaomi 14T (Urządzenie Docelowe)**:
   - **Ekran**: 6.67" CrystalRes AMOLED 1.5K (2712 x 1220 px, 446 ppi, format 20:9).
   - **Odświeżanie**: 144Hz / 120Hz AdaptiveSync, próbkowanie dotyku 480Hz.
   - **Procesor & GPU**: MediaTek Dimensity 8300-Ultra (4nm) + Mali-G615-MC6 GPU.
   - **Silnik haptyczny**: Liniowy silnik wibracyjny X-axis.
   - **Bateria**: 5000 mAh (zoptymalizowana pod True AMOLED Black #000000 z wygaszaniem pikseli).
2. **Optymalizacje wprowadzone w kodzie pod Xiaomi 14T**:
   - `touch-action: manipulation`: wyeliminowano opóźnienie 300ms tap-delay w WebView na ekranie 480Hz touch sampling.
   - Akceleracja GPU: `transform: translateZ(0)` i `overscroll-behavior-y: contain` dla płynnego scrollowania 144 klatek/s bez stutteringu i bez przypadkowego odświeżania gestem w dół.
   - Bezpieczne marginesy: `env(safe-area-inset-top)` dla centralnego aparatu punch-hole oraz `env(safe-area-inset-bottom)` dla dolnego paska gestów Xiaomi HyperOS.
   - Profil wibracji X-axis: mikropulsy 20ms i 45ms dające ostre, mechaniczne kliknięcie haptyczne.
3. **Uprawnienia w `AndroidManifest.xml`**:
   - `android.permission.INTERNET`: synchronizacja z chmurą Google Cloud Run i zapytań do Gemini API.
   - `android.permission.ACCESS_NETWORK_STATE`: wykrywanie połączenia online/offline.
   - `android.permission.VIBRATE`: haptyka przy ukończeniu serii oraz alarmie stopera.
   - `android.permission.WAKE_LOCK`: zapobieganie uśpieniu ekranu podczas trwania serii i odliczania odpoczynku.

### B. Ochrona przed ubijaniem procesu (Android Process Death):
- **Stoper treningowy**: Nie opiera się na ulotnym `setInterval`. Zamiast tego zapisuje w stanie uniwersalny znacznik czasu zakończenia `endTimestamp = Date.now() + seconds * 1000`. Nawet jeśli Android zamknie aplikację w tle lub użytkownik przełączy się na inną aplikację, po powrocie stoper precyzyjnie przelicza pozostały czas.
- **Odporność bazy danych**: Zapisy wykonywane są atomowo z sumą kontrolną sha256 (`atomicWriteFromGymData`). W razie nagłego rozładowania telefonu poprzednia spójna migawka bazy zostaje nienaruszona.

### C. Procedura budowania pliku `.apk` na Androida:
```bash
# 1. Instalacja zależności
npm install
npm install @capacitor/android @capacitor/cli

# 2. Zbudowanie pakietu produkcyjnego
npm run build

# 3. Dodanie i synchronizacja kodu z natywnym projektem Androida
npx cap add android
npx cap sync android

# 4. Otwarcie w Android Studio
npx cap open android

# 5. W Android Studio:
# Menu: Build -> Build Bundle(s) / APK(s) -> Build APK(s)
# Wynikowy plik: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🗂️ 4. SPIS WIDOKÓW I MODUŁÓW APLIKACJI

| Moduł / Widok | ID Widoku | Kluczowy Plik | Opis i Możliwości |
| :--- | :--- | :--- | :--- |
| **Pulpit Szybkiego Dostępu** | `quick_access` | `src/components/QuickAccessDashboard.tsx` | Modułowy pulpit Bento 3D: szybki podgląd dnia, stoper serii, kalkulator talerzy 3D z gryfem IWF, kalkulator 1RM (Brzycki & Epley), wskaźnik nawodnienia, notatnik i szybkie zapytania AI. Obsługuje przeciąganie kafelków (Drag & Drop) oraz szablony Gemini. |
| **Plan Treningowy & Serie** | `plan` | `src/components/WorkoutPlanView.tsx`<br>`src/components/ExerciseCard.tsx` | Zarządzanie mikrocyklem: dodawanie tygodni, dni, ćwiczeń. Rejestracja serii (`LoggedSet`), ciężarów z mikroskokami (+1.25, +2.5, +5.0 kg), wskaźniki progresu przeciążenia (Overload Indicator). |
| **Analityka i Progres Siły** | `stats` | `src/components/StatsView.tsx` | Wykresy e1RM, tonażu tygodniowego, regresja liniowa OLS, wskaźniki stagnacji, porównania tydzień-do-tygodnia, wykrywanie rekordów (PR). |
| **Rozkład Partii** | `muscle` | `src/components/MuscleDistributionView.tsx` | Wykresy słupkowe i kołowe objętości serii na poszczególne grupy mięśniowe (klatka, plecy, czworogłowe, dwugłowe, barki, ramiona). |
| **Dziennik Wagi & Obwodów** | `weight` | `src/components/BodyWeightTracker.tsx` | Monitorowanie wagi ciała, podkategorie (na czczo, po treningu, wieczór), filtracja szumu dwuetapową średnią EMA + mediana obwodów L/R. |
| **Kalendarz & Farmakokinetyka** | `cycles` | `src/components/CalendarCycleView.tsx` | Kalendarz iniekcji, rejestr dawek, dynamiczny symulator stężenia modelowego substancji we krwi w oparciu o okres półtrwania. |
| **Katalog Ćwiczeń** | `exercises` | `src/components/ExerciseCatalogView.tsx` | Wzorcowy słownik ćwiczeń odizolowany od planu (szablony, technika, sugerowane zakresy powtórzeń). |
| **Trener AI Online (Gemini)** | `ai` / `ai_coach` | `src/components/AiCoachView.tsx` | Pełny czat z 5 personami (Główny Trener, Analityk Danych, Specjalista Zdrowia, Motywator, Dietetyk). Generator planów treningowych, audytor badań krwi i pamięć faktów. |
| **Centrum Synchronizacji** | `profile` | `src/components/UserProfileView.tsx` | Zarządzanie profilem zawodnika, rejestr plików badań laboratoryjnych, status synchronizacji Cloud Run i parowanie kodem QR/PIN. |
| **Serwer & Aktualizacje** | `update_server` | `src/components/AppUpdateServerPanel.tsx` | Status chmury Google Cloud Run (`europe-west2`), diagnostyka ping ms, logowanie kontem Google (`eskejtpro@gmail.com`). |
| **Ustawienia & Auto-Backup** | `settings` | `src/components/SettingsView.tsx` | Motywy (Jasny, Ciemny, True AMOLED Black), gęstość kart, skalowanie UI, kopie bezpieczeństwa JSON i konfiguracja platformowa. |
| **Tryb Pełnej Mocy (Turbo 144Hz)** | `settings` (kategoria `turbo`) | `src/components/TurboPowerSettingsPanel.tsx` | Silnik 144Hz Turbo dla Xiaomi 14T, automatyczny generator rampy rozgrzewki (Smart Warm-up) z talerzami 3D, asystent progresji przeciążenia (+2.5kg), blokada wygaszania ekranu (WakeLock) i test haptyki X-axis. |

---

## 🧪 5. PROCEDURA I MACIERZ TESTÓW (71+ TESTÓW)

Aplikacja posiada rygorystyczny zestaw **71 automatycznych testów jednostkowych i integracyjnych** oraz **11 testów kontraktu serwera Express/Google Cloud**.

### Jak uruchomić testy:
```bash
# 1. Uruchomienie pełnego pakietu 71 testów jednostkowych:
npm test

# 2. Uruchomienie testów serwera Google Cloud i sesji Bearer:
npm run test:server

# 3. Weryfikacja typowania TypeScript i składni:
npm run lint

# 4. Sprawdzenie kompilacji produkcyjnej:
npm run build
```

### Szczegółowa macierz plików testowych:

1. **`tests/storage.test.cjs`**: Testy spójności magazynu danych, atomowości zapisu, odrzucania uszkodzonych struktur JSON, procedury tworzenia i retencji kopii zapasowych.
2. **`tests/room-database.test.cjs`**: Testy partycjonowania bazy danych Room SQL, relacji DAO między tabelami `weeks`, `days`, `exercises` i `logged_sets`.
3. **`tests/room-initialization-flow.test.cjs`**: Testy migracji ze starych struktur jednolicie spłaszczonych plików JSON do relacyjnej bazy Room.
4. **`tests/database-migration.test.cjs`**: Testy nienaruszalności danych (`fail-closed`), weryfikacji sumy kontrolnej SHA256 przed i po migracji.
5. **`tests/domain-mappers.test.cjs`**: Testy precyzyjnego mapowania encji domenowych (konwersja typów, wartości domyślne, filtrowanie pustych rekordów).
6. **`tests/workout-timer.test.cjs`**: Testy stabilności stopera treningowego, odporności na uśpienie karty przeglądarki i ubicie procesu w Androidzie.
7. **`tests/circumference.test.cjs` & `tests/body-measurements.test.cjs`**: Testy kalkulacji obwodów ciała, konwersji jednostek, eliminacji błędów skrajnych (Z-score).
8. **`tests/body-weight-subcategories.test.cjs`**: Testy wyliczania średniej kroczącej wagi (EMA) oraz agregacji w subkategoriach (na czczo / po treningu).
9. **`tests/quick-access-dashboard.test.cjs`**: Testy konfiguracji widgetów Bento, kalkulatora talerzy na gryf olimpijski 20kg, kalkulatora 1RM (Brzycki vs Epley).
10. **`tests/ai-coach-online.test.cjs`**: Testy kaskady modeli Gemini (`gemini-3.8-flash` -> `gemini-2.5-flash` -> `offline_knowledge_base`), wstrzykiwania kontekstu zawodnika i formatowania odpowiedzi.
11. **`tests/gemini-pro-intelligent-audit.test.cjs`**: Matematyczne testy odporności na dzielenie przez zero przy regresji liniowej i wzorach e1RM.
12. **`tests/android-apk-compatibility.test.cjs`**: Testy kompatybilności z systemem Android (cykl życia, ergonomia dotykowa, motyw AMOLED).
13. **`tests/card-density.test.cjs`**: Testy skalowania gęstości interfejsu (standardowa, kompaktowa, ultra-gęsta).
14. **`tests/app-knowledge-guide.test.cjs`**: Testy spójności bazy wiedzy aplikacji.
15. **`tests/full-e2e-application-suite.test.cjs`**: Kompleksowy test integracyjny ścieżki użytkownika (dodanie treningu -> uzupełnienie serii -> analiza 1RM -> kopia zapasowa).
16. **`tests/server.test.cjs`**: Testy kontraktu API serwera Express, autoryzacji Google, generowania tokenów sesyjnych Bearer, limitów zapytań (Rate Limiting) oraz CORS.

---

## 🛡️ 6. ZASADY DLA KOLEJNYCH AGENTÓW AI (KODEKS ROZWOJU)

Kiedy jakikolwiek Agent AI przejmuje pracę nad projektem, **MÓSI BEZWZGLĘDNIE PRZESTRZEGAĆ NASTĘPUJĄCYCH ZASAD**:

1. **Zasada nienaruszalności historii serii (*LoggedSet Immutability*)**:
   - Nigdy nie nadpisuj ani nie usuwaj zarejestrowanych serii (`LoggedSet`), chyba że użytkownik wyraźnie kliknie przycisk usunięcia.
   - Przy duplikowaniu tygodnia treningowego (`handleDuplicateWeek`) historia ćwiczeń jest zachowywana jako punkt odniesienia, ale checkboxy wykonania w nowym tygodniu muszą być wyczyszczone.

2. **Zasada atomowości bazy danych (*Fail-Closed Database*)**:
   - Wszelkie operacje zapisu do bazy Room SQL muszą być atomowe. W razie błędu parsowania lub niezgodności schematu aplikacja nie może nadpisać poprawnego pliku pustym szablonem.

3. **Zasada podwójnego silnika Online/Offline**:
   - Kluczowe funkcje treningowe (zapis serii, plan, stoper i kalkulatory) mają działać offline. Fallback AI może odpowiedzieć tylko jako jawnie oznaczona heurystyka lokalna; przy braku odpowiedzi aplikacja nie może udawać analizy ani synchronizacji.

4. **Stylistyka i Design 3D**:
   - Aplikacja używa nowoczesnego designu 3D Neumorphism 2.0. Nowe kafelki powinny korzystać z klas `.card-3d` (lub `.amoled-card-3d`), a nowe przyciski akcji z `.btn-3d-emerald` lub `.btn-3d-secondary`.
   - Zakaz stosowania "AI Slop" (płaskich generycznych fioletowych gradientów lub nieuzasadnionych badge'y).

5. **Obowiązek Aktualizacji Niniejszego Raportu**:
   - **Każdy Agent wprowadzający zmiany architektoniczne, nowe moduły lub nowe testy ma obowiązek zaktualizować ten plik (`AGENT_MASTER_REPORT.md`) oraz uruchomić `npm test` i `npm run test:server` przed zakończeniem zadania.**
# Aktualizacja stanu 3.0.1 (2026-10-02)

- Google sign-in na gałęzi 3.0.1 korzysta z prawdziwego ID tokenu i server-side verification. Token sesji jest tylko w pamięci UI; nie jest serializowany z ustawieniami.
- Google data store lokalny izoluje principal po verified `sub`; Cloud Run pozostaje fail-closed, bo brak trwałego/session store.
- `npm test` 91/91, `npm run test:server` 15/15, `npm run test:google-ui` 3/3, `npm run lint` oraz `npm run build` przeszły.
- Android target wygenerowany; assembleDebug nie może być potwierdzony bez Android SDK (`ANDROID_HOME`/`sdk.dir` brak), ADB/urządzenie niedostępne.
- Ten wpis nie zatwierdza historycznych twierdzeń w raporcie niżej jako nowych testów runtime; szczegóły zakresu i ograniczeń są w `CHANGELOG-V3.0.1.md`.

## Aktualizacja stanu 3.0.2 (2026-10-02)

- Odtworzono przypadek startowy w buildzie web: przy braku `room_tbl_*` i obecności poprawnej `planpasika_db_v3` wcześniejszy przepływ zastępował zapisany plan danymi przykładowymi. Inicjalizacja teraz przekazuje już wybrane dane startowe jako źródło odbudowy partycji.
- Aktywny adapter to TypeScript DAO + partycje JSON w `localStorage`; na Androidzie część danych jest asynchronicznie kopiowana przez Capacitor Preferences. To nie jest natywna baza SQLite, a `runInTransaction` nie zapewnia ACID/rollbacku.
- Kotlinowe `src/data/db/android/*.kt` nie są skompilowane przez `android/app`; nie wolno opisywać tego jako działającej Room Database.
- Usunięto fałszywy sukces przy przycisku „optymalizacji” — teraz przedstawia wyłącznie podsumowanie liczby lokalnych encji.
- Wersja package/UI/API/Android: 3.0.2, Android `versionCode=302`.
- Fresh verification i limity środowiskowe: `CHANGELOG-V3.0.2.md`.

## Aktualizacja stanu 3.0.3 (2026-10-02)

- Serwis aktualizacji przestał fabrykować wydanie 2.25.0, postęp pobierania, wynik checksum i sukces instalacji/rollbacku. Funkcje nieobsługiwane zwracają jawny brak wsparcia.
- Historia aktualizacji jest pusta, dopóki nie ma rzeczywistych wpisów; nie wpisuje fikcyjnej instalacji 2.24.0.
- Panel serwera został skorygowany: nie deklaruje automatycznego update, atomowego zapisu ani cloud replication.
- Package/API/UI/Android: 3.0.3, `versionCode=303`. Szczegóły świeżej weryfikacji: `CHANGELOG-V3.0.3.md`.
- Weryfikacja 3.0.3: update service 4/4, aplikacja 95/95, serwer 15/15, Google UI 3/3, lint/build/Capacitor sync/Android assembleDebug PASS. APK debug hash i brak device runtime testu zapisane w changelogu.

## Aktualizacja stanu 3.0.4 (2026-10-02)

- Timer nie jest domyślnie aktywny. Start/wznowienie jest jawne; potwierdzenie zakończenia zapisuje inactive, a ukończenie serii automatycznie rozpoczyna sesję, jeśli nie została rozpoczęta wcześniej.
- WakeLock jest scentralizowany i warunkowany ustawieniem, aktywną/niewstrzymaną sesją oraz widokiem planu; zwalniany przy ukryciu strony i wznowieniu zarządzany po powrocie. Realne zachowanie Android/Xiaomi pozostaje UNVERIFIED.
- Testy: app 100/100, server 15/15, Google UI 3/3, update service 4/4, lint/build/Capacitor sync/assembleDebug PASS. APK 3.0.4 i SHA-256: `CHANGELOG-V3.0.4.md`.

## Aktualizacja stanu 3.0.5 (2026-10-02)

- Bez działającego Gemini serwer nie tworzy już fikcyjnej oceny badań jako „w normie”; zwraca 503 `ai_unavailable`. UI pokazuje jasno, że wyniki nie zostały ocenione.
- Usunięto z żądania do audytu zdrowia niewykorzystywane notatki kalendarza. Prompt ogranicza wynik do edukacyjnego omówienia, nie diagnozy/leczenia.
- Wersja package/API/UI/Android: 3.0.5, Android `versionCode=305`; testy i artefakt w `CHANGELOG-V3.0.5.md`.
- Weryfikacja 3.0.5: app 102/102, server 16/16, Google UI 3/3, updater 4/4, lint/build/Cap sync/Android assembleDebug PASS. Urządzenie fizyczne UNVERIFIED.

## Aktualizacja stanu 3.0.6 (2026-10-02)

- `RoomStorageDriver.writeTable` propaguje błędy `localStorage`; pamięć podręczna aktualizuje się dopiero po udanym zapisie trwałym.
- Autosave może teraz zgłosić awarię trwałego zapisu zamiast fałszywego „Zapis lokalny OK”. Test regresyjny wymusza `QuotaExceededError`.
- Zapis nadal obejmuje wiele partycji bez ACID/rollbacku; to ograniczenie jest jawne.
- Weryfikacja 3.0.6: app 103/103, server 16/16, Google UI 3/3, updater 4/4, lint/build/Cap sync/Android assembleDebug PASS. APK 3.0.6 zbudowany i podpis debug zweryfikowany; brak podłączonego telefonu, runtime UNVERIFIED. Szczegóły: `CHANGELOG-V3.0.6.md`.

## Aktualizacja stanu 3.0.7 (2026-10-02)

- Rutynowy czat AI przestał dołączać badania krwi, notatki kalendarza, profil użytkownika i trwałe pamięci AI; historia czatu ograniczona do ostatnich 8 wiadomości.
- Awaria transportu nie jest już prezentowana jako wygenerowana odpowiedź lub synchronizacja zakończona sukcesem; AI Coach i Quick Access pokazują niedostępność.
- Weryfikacja 3.0.7: app 107/107, server 16/16, Google UI 3/3, updater 4/4, lint/build/Cap sync/Android assembleDebug PASS. APK debug zweryfikowany; urządzenie fizyczne niepodłączone, runtime UNVERIFIED. Szczegóły: `CHANGELOG-V3.0.7.md`.
- Inwentaryzacja wszystkich tras Express oraz mapowanie do wywołań UI: `API-ROUTE-INVENTORY.md`. Wskazuje nieużywane trasy, brak pełnego pokrycia testami AI oraz brak walidacji zakresów w dwóch endpointach.

## Aktualizacja stanu 3.0.8 (2026-10-02)

- Walidacja `/api/ai/coach/audit-health` ogranicza do 50 wyników i 12 kB JSON, kontroluje nazwy/wartości/jednostki/datę/zakresy, ignoruje nieznane pola i serializuje do promptu tylko dozwolone pola.
- Dane w promptcie są jawnie oznaczone jako niezaufane; brak kosztu infrastruktury i brak zmian w danych przechowywanych.
- Cloud Run nasłuchuje na `0.0.0.0` i `PORT`; lokalny serwer zachowuje `127.0.0.1:3000`. Test uruchomieniowy skompilowanego serwera potwierdził odpowiedź `degraded` na `/api/health`.
- Metadane Cloud Run pokazują HTTPS na wejściu usługi, lecz nie reklamują niedostępnego magazynu ani logowania jako aktywnych możliwości.
- Weryfikacja bieżących zmian: app 110/110, server/OIDC 18/18, Google UI 3/3, updater 4/4, lint i web/server build PASS. Android 3.0.8, telefon i chmurowa trwałość danych pozostają UNVERIFIED. Szczegóły: `CHANGELOG-V3.0.8.md`.

## Prace nad magazynem Cloud Run po 3.0.8

- Opcjonalny adapter `server/data/firestoreStore.ts` przechowuje stan i sesje w oddzielnych dokumentach Firestore, indeksowanych skrótem identyfikatora konta `sub` lub skrótem tokenu. Warunkowy zapis po `updateTime` zapobiega cichej utracie równoległych zmian. Adapter jest wyłączony bez `GYMTRACKER_CLOUD_STORE=firestore` i `GYMTRACKER_FIRESTORE_PROJECT_ID`.
- Limit prób logowania Google korzysta w trybie Cloud Run z dokumentu Firestore i warunkowego zapisu; nie opiera się na pamięci pojedynczej instancji. Wybór adresu klienta za proxy Cloud Run wymaga jeszcze weryfikacji na żywej usłudze.
- Testy serwera 26/26, aplikacji 110/110, updatera 4/4, Google UI 3/3, lint i web/server build PASS. Testy Firestore korzystają z symulowanego transportu; nie wykonano żadnego żądania do prawdziwego projektu Google Cloud.
