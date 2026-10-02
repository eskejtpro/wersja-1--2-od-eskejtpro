# GymTracker Pro 3.0.4

## Zakres

- Timer sesji nie uruchamia się samoczynnie przy każdym otwarciu aplikacji.
- Przycisk sesji rozpoczyna nowy trening albo wznawia zapauzowany; pauza zachowuje czas, a potwierdzenie zakończenia czyści aktywną sesję.
- Zapis ukończonej serii rozpoczyna sesję automatycznie, jeśli użytkownik nie uruchomił jej wcześniej.
- Dodano jawny, trwały klucz aktywnej sesji i ostrożną migrację: ze starego formatu wznawiana jest jawnie zapauzowana sesja; sam dawny znacznik czasu nie jest dowodem treningu.
- WakeLock jest zarządzany wyłącznie w głównym przepływie, tylko dla aktywnej i niezapauzowanej sesji w widoku planu; zwalniany przy pauzie, zakończeniu, zmianie widoku/ustawienia i ukryciu strony; po powrocie próbuje być odtworzony.
- Usunięto niezwalniany, drugi WakeLock z panelu ustawień.
- Wersja: 3.0.4, Android `versionCode=304`.

## Weryfikacja

- Testy stanu sesji i bramki WakeLock: 5/5 PASS; dotychczasowy timer wall-clock: 1/1 PASS.
- `npm run test:server`: 15/15 PASS.
- `npm test`: 100/100 PASS.
- `npm run test:server`: 15/15 PASS.
- `npm run test:google-ui`: 3/3 PASS.
- `npm run test:update`: 4/4 PASS.
- `npm run lint`: PASS (`tsc --noEmit`).
- `npm run build`: PASS; główny chunk 1,634.24 kB minified / 421.62 kB gzip (warning >500 kB).
- `npx cap sync android`: PASS.
- `gradlew assembleDebug`: BUILD SUCCESSFUL z tymczasowym JDK 21.
- APK debug: `C:\Users\Lucyna\Desktop\PlanPasika-GymTracker-Pro-v3.0.4-debug.apk`, 7,152,201 B, `applicationId=com.gymtracker.pro`, `versionName=3.0.4`, `versionCode=304`; `apksigner verify` PASS; SHA-256 `7EB771DCE746D928C389EFE33B9DFF20DCEA64E2387F2675A586870E2D6E6FDE`. Kopia z Pulpitu zweryfikowana po skopiowaniu; Gradle generował ten sam artefakt wejściowy.
- Instalacja/runtime telefonu: UNVERIFIED.

## Znane ograniczenia

- Stare sesje bez jawnego stanu pauzy nie są automatycznie odtwarzane, bo historyczny timer tworzył znacznik czasu przy każdym uruchomieniu aplikacji.
- Screen-off/background/device lifecycle i faktyczny WakeLock na Xiaomi 14T wymagają testu na urządzeniu.
