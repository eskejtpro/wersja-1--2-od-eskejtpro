# GymTracker Pro 3.0.6

## Zakres

- `RoomStorageDriver.writeTable` nie połyka już błędów trwałego zapisu w `localStorage`.
- Cache w pamięci jest aktualizowany dopiero po udanym zapisie trwałym; błąd może teraz dotrzeć do autosave i zostać zgłoszony jako niepowodzenie.
- Błędy asynchronicznej kopii `Preferences` są logowane jako ostrzeżenia. `localStorage` pozostaje źródłem synchronicznym; kopia Androida nadal ma charakter best-effort.
- Dodano regresję wymuszającą `QuotaExceededError` i asercję odrzucenia zapisu bazy.
- Zmiana nie zapewnia atomowości ani rollbacku między wieloma partycjami.
- Wersja: 3.0.6, Android `versionCode=306`.

## Weryfikacja

- `npm test`: 103/103 PASS.
- `npm run test:server`: 16/16 PASS.
- `npm run test:google-ui`: 3/3 PASS.
- `npm run test:update`: 4/4 PASS.
- `npm run lint`: PASS (`tsc --noEmit`).
- `npm run build`: PASS; główny chunk 1,634.48 kB minified / 421.75 kB gzip (ostrzeżenie rozmiaru >500 kB).
- `npx cap sync android`: PASS; Google provider enabled, Facebook/Apple/Twitter disabled.
- Android `gradlew assembleDebug`: BUILD SUCCESSFUL z tymczasowym Temurin JDK 21.0.12.1; pobrane archiwum SHA-256 zweryfikowano przed użyciem, bez instalacji globalnej.
- APK debug: `C:\Users\Lucyna\Desktop\PlanPasika-GymTracker-Pro-v3.0.6-debug.apk`, 6,647,441 B, `applicationId=com.gymtracker.pro`, `versionName=3.0.6`, `versionCode=306`; `apksigner verify` PASS; SHA-256 `879F19AD5AC96DB803F61C361562D7B4AD5FAA1229365174EC6F1DFB4918C5E6`.
- Urządzenie fizyczne nie jest podłączone. Emulator jest skonfigurowany, ale nieuruchomiony ze względu na 1.63 GB wolnej pamięci RAM; instalacja i runtime pozostają UNVERIFIED.
