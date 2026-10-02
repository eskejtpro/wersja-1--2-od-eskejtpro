<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# GymTracker Pro 2.24.0

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f73d3b8a-9b3c-4d02-9ae6-ee4e2ba664f6

### Lokalny serwer

Wymagany jest Node.js oraz `npm install`. Skopiuj `.env.example` do `.env`, ustaw login i hash scrypt hasła, a następnie uruchom `npm run dev`. Serwer działa domyślnie na `http://127.0.0.1:3000`; LAN pozostaje wyłączony, dopóki `GYMTRACKER_BIND` nie zostanie ręcznie zmieniony. Dane API są pamięciowe i nie ingerują w zapis Electron/local storage.

Szczegółowy kontrakt endpointów, format `{ schemaVersion: 1, data: GymData }`, konfiguracja sesji, ograniczenia aktualizacji i lokalnego agenta znajduje się w [`SERVER-CONTRACT.md`](SERVER-CONTRACT.md). Testy serwera uruchamia `npm run test:server`; istniejące testy aplikacji pozostają bez zmian.

Serwerowy agent działa wyłącznie jako `heuristic_local` (`provider: local_heuristic`, bez połączeń wychodzących) na jawnie przekazanym, ograniczonym wycinku danych. Dane serwera są zapisywane atomowo poza repozytorium do `GYMTRACKER_DATA_FILE` albo domyślnie `%LOCALAPPDATA%\\GymTracker\\server_data.json`; nie jest to `workout_data.json` Electrona. Panel synchronizacji ma opt-in health check i push z kontrolą `revision/contentHash`; lokalny zapis pozostaje źródłem offline-first, a pełna dwukierunkowa synchronizacja Android–Windows nie jest jeszcze aktywna. Przy istniejących danych zapis wymaga zgodnego `revision` i `contentHash`. Dla sieci TLS wymaga `GYMTRACKER_TLS_CERT_FILE` i `GYMTRACKER_TLS_KEY_FILE`; niezabezpieczony HTTP jest dostępny wyłącznie po jawnym `GYMTRACKER_ALLOW_INSECURE_LOCALHOST=1` na loopback. Bez zgodnego manifestu aktualizacji endpointy zwracają `unavailable_not_configured`; nie ma automatycznego instalatora ani wymaganej usługi AI.
