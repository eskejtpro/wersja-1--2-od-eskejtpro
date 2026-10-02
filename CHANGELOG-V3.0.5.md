# GymTracker Pro 3.0.5

## Zakres

- Audyt zdrowotny AI nie zwraca już tekstu sugerującego, że wyniki są prawidłowe, gdy Gemini nie jest skonfigurowane. Serwer odpowiada `503 ai_unavailable`; UI wyraźnie informuje, że wyniki nie zostały ocenione.
- Walidacja wejścia zdrowotnego odrzuca nieprawidłową strukturę (`400`), a pusty wynik upstream AI nie jest prezentowany jako udany audyt (`502`).
- Usunięto z żądania do tego endpointu niewykorzystywane notatki kalendarza (minimalizacja wysyłanych danych).
- Prompt zdrowotny ogranicza analizę do nie-diagnostycznego omówienia; wymaga jawnych zakresów referencyjnych i zakazuje zaleceń leczenia/dawek.
- Dodano test regresyjny rzeczywistego endpointu bez klucza AI i testy UI/promptu.
- Wersja: 3.0.5, Android `versionCode=305`.

## Weryfikacja

- `tests/health-audit-safety.test.cjs`: 2/2 PASS.
- Test endpointu serwera bez AI: PASS (`503`, brak `auditText`).
- `npm test`: 102/102 PASS (2.21 s).
- `npm run test:server`: 16/16 PASS; w tym request do serwera bez klucza AI potwierdza `503`, bez tekstu oceniającego badania.
- `npm run test:google-ui`: 3/3 PASS.
- `npm run test:update`: 4/4 PASS.
- `npm run lint`: PASS (`tsc --noEmit`).
- `npm run build`: PASS; główny chunk 1,634.46 kB minified / 421.73 kB gzip (warning >500 kB).
- `npx cap sync android`: PASS.
- `gradlew assembleDebug`: BUILD SUCCESSFUL z tymczasowym JDK 21.
- APK debug: `C:\Users\Lucyna\Desktop\PlanPasika-GymTracker-Pro-v3.0.5-debug.apk`, 6,681,268 B, `applicationId=com.gymtracker.pro`, `versionName=3.0.5`, `versionCode=305`; `apksigner verify` PASS; SHA-256 `E96B64578729F015479B64D6962D8811CB5E423E27B714C77F6E32D6E0E5BD13`. Kopia na Pulpicie i build output mają identyczny hash.
- Instalacja/runtime na telefonie: UNVERIFIED.
