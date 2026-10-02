# GymTracker Pro 3.0.8 — prace w toku

## Server

- `/api/ai/coach/audit-health` waliduje i ogranicza dane wejściowe; do promptu przekazuje tylko dozwolone pola badań i masę ciała. Odrzuca błędne rekordy, daty, zakresy oraz zbyt duży ładunek.
- Cloud Run (`K_SERVICE`) używa `0.0.0.0` i `PORT`. Lokalnie pozostaje `127.0.0.1:3000`.
- Metadane Cloud Run rozróżniają HTTPS na wejściu Google od HTTP wewnątrz kontenera i nie zgłaszają niedostępnych funkcji chmurowych jako aktywnych.
- Cloud Run nadal nie ma trwałego magazynu sesji i danych; logowanie i zapis chmurowy zwracają 503. Nie wdrożono usługi Google Cloud.

## Weryfikacja

- `npm run lint`: PASS.
- `npm test`: 110/110 PASS. Testy środowiska Node wypisują oczekiwane błędy symulowanego `QuotaExceededError` i brak `window` w mocku Preferences; nie spowodowały niezaliczenia testów.
- `npm run test:server`: 18/18 PASS.
- `npm run test:google-ui`: 3/3 PASS.
- `npm run test:update`: 4/4 PASS.
- `npm run build`: PASS. Główny chunk JS 1,633.75 kB (gzip 421.40 kB); Vite zgłasza ostrzeżenie o rozmiarze.
- Skompilowany serwer z symulowanym `K_SERVICE` i `PORT`: `/api/health` odpowiedział `degraded`, zgodnie z brakiem trwałego store.
- Android sync, APK 3.0.8, instalacja i działanie na telefonie: UNVERIFIED.

## Pozostało przed wdrożeniem chmurowym

- Wybrać i wdrożyć trwały magazyn danych oraz sesji, z testami restartu, równoległego zapisu i konfliktu rewizji.
- Zweryfikować projekt Google Cloud, uprawnienia, rozliczenia, ustawienia dostępu oraz koszty przed utworzeniem usługi.
