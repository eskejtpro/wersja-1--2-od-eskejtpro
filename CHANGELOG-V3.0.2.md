# GymTracker Pro 3.0.2

## Zakres

- Naprawiono start po utracie/braku podzielonych kluczy: inicjalizacja odtwarza je z już wczytanych danych aplikacji zamiast bezwarunkowo zastępować przykładowym planem.
- Etykiety zapisu i poradnik opisują rzeczywistą warstwę: logiczne partycje JSON w `localStorage`, z asynchronicznym best-effort mirror przez Capacitor Preferences. Nie przedstawiają jej jako aktywnej bazy SQLite/Room ani transakcji ACID.
- Usunięto fikcyjny komunikat „optymalizacji” bazy; przycisk pokazuje teraz wyłącznie liczbę lokalnych tygodni, dni i ćwiczeń, bez deklarowania modyfikacji.
- Android manifest deklaruje `VIBRATE` i `WAKE_LOCK`, których używają funkcje haptyki i blokady ekranu.
- Ujednolicono wersję 3.0.2 w package, API, nagłówku UI i natywnym Androidzie (`versionCode` 302).

## Weryfikacja

- `npm run lint`: PASS.
- `npm test`: 95/95 PASS.
- `npm run test:server`: 15/15 PASS.
- `npm run test:google-ui`: 3/3 PASS.
- `npm run build`: PASS; główny chunk 1,633.03 kB minified / 421.32 kB gzip (warning >500 kB).
- `npx cap sync android`: PASS; provider Google enabled, pozostałe social providery disabled.
- `gradlew assembleDebug`: BUILD SUCCESSFUL po użyciu tymczasowego Temurin JDK 21.0.12.1 (SHA-256 sprawdzony), bez zmiany systemowego `JAVA_HOME`.
- APK: `android/app/build/outputs/apk/debug/app-debug.apk`, 6,646,501 B; `applicationId=com.gymtracker.pro`, `versionName=3.0.2`, `versionCode=302`; debug signature; SHA-256 `D3ADB5181D5D43451C99FD7E838CE73E450A25825C3A1E0B119DF5067DC36034`.
- Kopia APK na Pulpicie: `C:\Users\Lucyna\Desktop\PlanPasika-GymTracker-Pro-v3.0.2-debug.apk`, hash zgodny z artefaktem.
- Build APK przeszedł. Brak podłączonego urządzenia; AVD `Medium_Phone_API_37.0` istnieje, ale nie uruchamiałem go przy tylko 968 MB wolnej pamięci RAM. Runtime na telefonie pozostaje UNVERIFIED.
- Rzeczywisty scenariusz browser startup recovery: PASS — po usunięciu partycji `room_tbl_*` zachował tydzień/dzień/zawodnika z `planpasika_db_v3` i utworzył snapshot przed migracją.

## Ograniczenia znane po audycie

- `src/data/db/android/*.kt` nie jest częścią źródeł modułu `android/app`; natywna Room SQLite nie jest obecnie używana przez aplikację Capacitor.
- Kopia Capacitor Preferences jest best-effort i nie jest odczytywana przy starcie jako mechanizm odzyskiwania. Realna transakcja/rollback między partycjami i migracja do trwałego SQLite pozostają osobnym zadaniem.
- APK nie jest jeszcze testowany na telefonie Xiaomi 14T; realny Google OAuth wymaga skonfigurowanych Web/Android OAuth Client IDs i SHA-1.
- Build web raportuje główny chunk około 1.63 MB (minified, gzip około 421 kB); pomiar startu i renderowania na Xiaomi 14T pozostaje niezweryfikowany.
- Gradle zgłosił ostrzeżenia o `flatDir`, usuniętym providerze Facebook oraz unchecked/deprecated Java; bez błędów kompilacji.
