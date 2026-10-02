# GymTracker Pro 3.0.3

## Zakres

- Usunięto symulowane wydanie 2.25.0, udawany postęp pobierania, zawsze pozytywny checksum oraz fikcyjne sukcesy instalacji i rollbacku.
- Kontrola aktualizacji raportuje wyłącznie odpowiedź serwera; brak konfiguracji, HTTP error i brak sieci są wyświetlane jako niedostępność.
- Pusta historia aktualizacji nie dopisuje nieistniejącego wydania bazowego.
- Panel serwera nie deklaruje automatycznej aktualizacji, atomowości ani replikacji w chmurze, których działanie nie jest obecnie dostępne.
- Wersja ujednolicona do 3.0.3 / Android `versionCode=303`.

## Weryfikacja

- `npm run test:update`: 4/4 PASS.
- `npm test`: 95/95 PASS.
- `npm run test:server`: 15/15 PASS (po aktualizacji oczekiwanej wersji w teście health).
- `npm run test:google-ui`: 3/3 PASS.
- `npm run lint`: PASS (`tsc --noEmit`).
- `npm run build`: PASS; główny chunk 1,633.06 kB minified / 421.30 kB gzip (warning >500 kB).
- `npx cap sync android`: PASS; Google provider enabled, pozostałe social providery disabled.
- `gradlew assembleDebug`: BUILD SUCCESSFUL z tymczasowym JDK 21; APK `com.gymtracker.pro`, `versionName=3.0.3`, `versionCode=303`, debug signature.
- Desktop APK: `C:\Users\Lucyna\Desktop\PlanPasika-GymTracker-Pro-v3.0.3-debug.apk`, 6,646,497 B, SHA-256 `F592AF47DAA1ACA4E3124A9CA862EEDBD87DB8FF2521E9DB0EB5E18951CEBD8A`; kopia identyczna z build output. `apksigner` potwierdził Android Debug certificate.
- Instalacja i runtime na telefonie: UNVERIFIED (brak podłączonego telefonu; AVD nieuruchomiony).

## Ograniczenia

- Lokalny serwer jawnie odpowiada HTTP 503 dla download/apply/rollback; aktualizacja aplikacji jest ręczna.
- Odzyskiwanie persistent data oraz fakt, że aktywny adapter nie jest Room SQLite, pozostają opisane w `CHANGELOG-V3.0.2.md`.
