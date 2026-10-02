# GymTracker Pro 3.0.1 — kontrakt lokalnego serwera

`server.ts` jest jedynym serwerem Node/Express projektu. Domyślnie nasłuchuje wyłącznie na `127.0.0.1:3000`; LAN można włączyć ręcznie przez `GYMTRACKER_BIND`, np. po świadomym ustawieniu adresu interfejsu. Serwer przechowuje własny magazyn poza repozytorium i nigdy nie dotyka `workout_data.json` aplikacji desktopowej.

## Uruchomienie i konfiguracja

```powershell
Copy-Item .env.example .env
# ustaw GYMTRACKER_USERNAME i wygenerowany GYMTRACKER_PASSWORD_HASH
npm run dev
```

Hash hasła można wygenerować przez eksport `createPasswordHash` z `server.ts`. Alternatywnie `GYMTRACKER_AUTH_FILE` wskazuje plik JSON **poza repozytorium** zawierający `{ "username": "...", "passwordHash": "scrypt$..." }`. Puste dane logowania oznaczają brak możliwości logowania, nie domyślne hasło. `GYMTRACKER_SESSION_TTL_MS`, `GYMTRACKER_MAX_LOGIN_ATTEMPTS`, `GYMTRACKER_LOGIN_WINDOW_MS` i `GYMTRACKER_MAX_BODY` ograniczają sesje, brute force i żądania. `GYMTRACKER_DATA_FILE` wskazuje trwały magazyn serwera; domyślnie jest to `%LOCALAPPDATA%\\GymTracker\\server_data.json`. TLS w procesie wymaga `GYMTRACKER_TLS_CERT_FILE` i `GYMTRACKER_TLS_KEY_FILE`; `GYMTRACKER_ALLOW_INSECURE_LOCALHOST=1` jest wyłącznie jawnym wyjątkiem developerskim dla loopback. Token jest Bearer, nie cookie, więc nie jest zapisywany w URL ani logach.

## Endpointy

- `GET /api/health` i `GET /api/version` — status, wersje, schema version i capabilities.
- `POST /api/auth/login` — body `{ "username", "password" }`; zwraca krótkotrwały token Bearer. `POST /api/auth/logout` unieważnia bieżącą sesję.
- `POST /api/auth/google/login` — body `{ "idToken" }`; serwer sprawdza podpis, audience, issuer i expiry tokenu Google oraz używa `sub` jako principal. Wymaga `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_IDS`; Cloud Run blokuje logowanie bez trwałego magazynu.
- `GET /api/auth/google/user` i `POST /api/auth/google/logout` — wymagają Bearer; profil pochodzi z własnej sesji, logout unieważnia tę sesję.
- `GET /api/server/google-info` — metadane procesu; odpowiedź nie potwierdza trwałości danych ani dostępności 24/7.
- `GET /api/data` — autoryzowany odczyt `{ schemaVersion, revision, updatedAt, contentHash, data }` z trwałego magazynu.
- `POST /api/data` — autoryzowany zapis body `{ schemaVersion: 1, revision?, contentHash?, data: GymData }`; przy istniejących danych wymagane są zgodne revision i contentHash, inaczej `409 conflict`.
- `GET /api/sync/status` — revision, updatedAt, contentHash, deviceId oraz online/offline. To status serwera, nie pełna synchronizacja Androida.
- `GET /api/update/check` i `GET /api/update/history` — metadane z opcjonalnego manifestu wskazanego przez `GYMTRACKER_UPDATE_MANIFEST`; wpis musi zawierać `version`, `packageUrl` (`https`/`file`), `sha256` (64 znaki hex), `sizeBytes` i `minSupportedVersion`; bez zgodnego manifestu zwracają `unavailable_not_configured`.
- `POST /api/agent/analyze` — autoryzowana, lokalna heurystyka na przekazanym wycinku danych. Nie pobiera automatycznie całego `GymData` i nie wykonuje połączeń zewnętrznych.

Pozostawione historyczne `/api/update/download/:version`, `/api/update/apply` i `/api/update/rollback` zwracają jawne `503 unavailable_not_configured`; serwer nie udaje pobierania, instalacji ani rollbacku i nie uruchamia instalatora. Manifest stanowi miejsce pod późniejszą weryfikację podpisu, ale podpis nie jest jeszcze weryfikowany.

Panel UI może wykonać jawny health check oraz push danych do `/api/data`, jeśli `syncConfig.serverUrl` wskazuje serwer i `syncConfig.authToken` zawiera ważny Bearer token. Sesja Google i synchronizacja pozostają odrębne; samo zalogowanie nie włącza sync. Pull i pełne scalanie Android–Windows nie są jeszcze aktywne.

## Bezpieczeństwo i ograniczenia

Tokeny sesji są przechowywane wyłącznie jako skróty SHA-256 w pamięci, hasła są sprawdzane jako hash scrypt, a Google login wymaga zweryfikowanego ID tokenu i limituje próby. CORS używa dokładnej allowlisty, body ma limit, błędny JSON nie zamyka procesu, a logi nie zawierają haseł, tokenów ani `GymData`. Klient nie zapisuje Bearer tokenu w GymData/localStorage.

Zapis danych jest atomowy: serwer zapisuje tymczasowy plik obok docelowego i zmienia nazwę dopiero po pełnym zapisie. Uszkodzony plik powoduje kontrolowany status `503 data_store_unavailable`; serwer nie usuwa ani nie nadpisuje go automatycznie. Helmet ustawia bezpieczne nagłówki; CSP i HSTS są aktywne w produkcji TLS. Aktualizacje nie mają automatycznego instalatora i nie serwują niezweryfikowanych plików. Serwer nie używa Firebase, bazy, Redis, Dockera ani zewnętrznego AI.
