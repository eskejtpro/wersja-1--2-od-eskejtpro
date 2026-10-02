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
- Android assembleDebug nie zakończony: systemowy JDK 17 zwrócił `invalid source release: 21`; JDK 21 nie znaleziono w typowych katalogach. APK 3.0.6 nie został zbudowany.
- Instalacja/runtime na urządzeniu: UNVERIFIED.
