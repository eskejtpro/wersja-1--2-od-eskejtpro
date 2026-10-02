# GymTracker Pro 3.0.1

## Zakres

- Zastąpiono imitowane logowanie Google przepływem OAuth OIDC: aplikacja otrzymuje Google ID token, a serwer weryfikuje go kryptograficznie. Nie przyjmuje profilu użytkownika przesłanego przez klienta.
- Dodano pole HTTPS URL serwera w Ustawieniach; adres API można skonfigurować bez wbudowywania go w aplikację.
- Profile i magazyny lokalne są przypisane do zweryfikowanego `sub`; endpointy profilu i logout wymagają własnej sesji Bearer.
- Token sesji pozostaje w stanie pamięci aplikacji, nie w GymData/localStorage. Po restarcie należy zalogować się ponownie.
- Usunięto stałe publiczne endpointy, pairing codes oraz komunikaty sugerujące niezweryfikowane 24/7/TLS/cloud sync.
- Chronione są kosztowne endpointy AI przy nasłuchu poza loopback; Cloud Run blokuje logowanie i magazyn danych, dopóki nie skonfiguruje się trwałego backendu.
- Usunięto Android cleartext/mixed-content flags; wygenerowano natywny Capacitor Android target.
- Usunięto symulowane wyniki ping/synchronizacji w profilu; niedostępna synchronizacja raportuje tryb lokalny zamiast fałszywego sukcesu.

## Weryfikacja

- `npm run lint`: PASS.
- `npm test`: 91/91 PASS.
- `npm run test:server`: 15/15 PASS.
- `npm run test:google-ui`: 3/3 PASS.
- `npm run build`: PASS.
- `npx cap sync android`: PASS; SocialLogin Google jest włączony, pozostałe social providery wyłączone.
- `gradlew assembleDebug`: UNVERIFIED/FAIL środowiska — Android SDK nie jest skonfigurowane (`ANDROID_HOME`/`sdk.dir` brak). `adb` również niedostępne; test telefonu nie wykonano.

## Konfiguracja Google

- Klient: `VITE_GOOGLE_WEB_CLIENT_ID` oraz opcjonalnie `VITE_GYMTRACKER_SERVER_URL`.
- Serwer lokalny: `GOOGLE_CLIENT_ID` lub lista `GOOGLE_CLIENT_IDS` rozdzielona przecinkami.
- OAuth Android wymaga skonfigurowanego Android OAuth Client dla `applicationId` i SHA-1 podpisującego certyfikatu. Brak danych uwierzytelniających oznacza, że rzeczywiste konto Google nie zostało przetestowane.
- Cloud Run pozostaje zamknięty dla logowania do czasu wdrożenia trwałego/session store; żaden płatny zasób nie został utworzony.
