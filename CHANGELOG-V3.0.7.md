# GymTracker Pro 3.0.7

## Zakres

- Rutynowe zapytanie Trenera AI przekazuje ograniczony kontekst treningowy: aktualny etap i maksymalnie 12 ćwiczeń. Nie dołącza automatycznie nazwiska, masy ciała, badań krwi, notatek kalendarza ani trwałych pamięci AI.
- Do serwera trafia bieżące pytanie i najwyżej 8 wcześniejszych wiadomości; ostatnie pytanie nie jest powielane w historii.
- Awaria transportu w Coach i brak/niepoprawna odpowiedź w Quick Access są jawnie oznaczane jako niedostępność; UI nie fabrykuje wtedy porady ani statusu synchronizacji.
- Awaria usługi AI Coach na serwerze zwraca `503 ai_unavailable` zamiast ogólnego tekstu pod HTTP 200.
- Testy regresyjne sprawdzają minimalizację kontekstu i brak fikcyjnej odpowiedzi.
- Wersja: 3.0.7, Android `versionCode=307`.

## Weryfikacja

- `npm test`: 107/107 PASS.
- `npm run test:server`: 16/16 PASS.
- `npm run test:google-ui`: 3/3 PASS.
- `npm run test:update`: 4/4 PASS.
- `npm run lint`: PASS (`tsc --noEmit`).
- `npm run build`: PASS; główny chunk 1,633.75 kB minified / 421.40 kB gzip (ostrzeżenie rozmiaru >500 kB).
- `npx cap sync android`: PASS; Google provider enabled, Facebook/Apple/Twitter disabled.
- Android `gradlew assembleDebug`: BUILD SUCCESSFUL z tymczasowym, zweryfikowanym Temurin JDK 21.0.12.1.
- APK debug: `C:\Users\Lucyna\Desktop\PlanPasika-GymTracker-Pro-v3.0.7-debug.apk`, 7,152,461 B, `applicationId=com.gymtracker.pro`, `versionName=3.0.7`, `versionCode=307`; `apksigner verify` PASS; SHA-256 `747A7F9A098A746EABF3E6540FB3C3AA43B6674E3C7C247CC9F99FF124CBDFBD`. Build output i kopia desktop mają identyczny hash.
- Urządzenie fizyczne nie jest podłączone. Emulator nieuruchomiony przy 1.63 GB wolnej RAM; instalacja i runtime UNVERIFIED.
