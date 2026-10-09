# PlanPasika v3.0.9 — import funkcji z v222

Data: 2026-10-09

## Włączone w tej wersji

- Powiększony dolny pasek nawigacji Android dla wygodniejszej obsługi dotykiem.
- Zwijanie pojedynczych kart ćwiczeń oraz zbiorcze `Zwiń wszystkie` i `Rozwiń wszystkie`; wybór jest zachowywany lokalnie.
- Historia nawodnienia: wpisy dla konkretnych dni, szybkie ilości, własna ilość, usuwanie wpisu i podsumowanie siedmiu dni.
- Kalendarz: opcjonalna godzina notatki oraz oznaczanie zadania jako wykonanego bez kasowania historii.

## Zachowana zgodność

- Stare kopie danych pozostają obsługiwane: nowe pola notatek i historia nawodnienia są opcjonalne.
- Zachowano istniejące logowanie Google, synchronizację oraz konfigurację Cloud Run/Firestore.
- Nie przenoszono starszego klienta serwera ani konfiguracji OAuth z repozytorium v222.

## Weryfikacja

- Kontrola TypeScript: PASS.
- Test historii nawodnienia: 2/2 PASS.
- Zestaw scenariuszy aplikacji: 10/10 PASS.
- Build web + serwer: PASS.
- Synchronizacja Capacitor Android: PASS.
- Debug APK: `com.gymtracker.pro`, versionName `3.0.9`, versionCode `309`.

## Świadomie odłożone

- Nie dodano niezależnego wywołania AI dla kalendarza z v222, ponieważ korzysta ono ze starszego kontraktu serwera. Funkcję można dodać po osobnym, bezpiecznym ujednoliceniu endpointu API.
