# PlanPasika — serwer Google Cloud: stan i instrukcja

Stan sprawdzony lokalnie 2026-10-02 dla kodu 3.0.8 i niewydanych prac nad magazynem Cloud. Usługa Google Cloud **nie została utworzona**. Nie ma potwierdzonego projektu, sesji konta Google Cloud ani zgody na potencjalne koszty.

## Jak ma działać

Telefon wysyła żądania HTTPS do usługi Cloud Run. Google kończy TLS i przekazuje żądania do procesu Node/Express w kontenerze. Cloud Run uruchamia dodatkowe instancje według ruchu i może je wyłączać przy braku ruchu. Dlatego pliki kontenera i pamięć procesu nie są trwałym magazynem danych. Docelowo backend weryfikuje Google ID token, identyfikuje konto przez `sub`, zapisuje sesję i dane w trwałym magazynie oraz rozstrzyga konflikty rewizji przy synchronizacji. Lokalne dane treningowe w telefonie mają działać także bez sieci.

## Stan obecnego kodu

- `server.ts` ma trasy API, lokalne sesje i lokalne pliki JSON. W trybie Cloud Run (`K_SERVICE`) nasłuchuje na `0.0.0.0` i `PORT` oraz używa produkcyjnych plików statycznych także bez `NODE_ENV=production`; sprawdzono uruchomieniem skompilowanego serwera.
- W trybie Cloud Run bez konfiguracji magazynu logowanie i chmurowe dane zwracają 503. Adapter Firestore istnieje w kodzie i jest domyślnie wyłączony; testy z symulowanym transportem obejmują restart, izolację kont, konflikt zapisu, limit prób logowania i wylogowanie. Prawdziwy Firestore nie został przetestowany. Metadane `durableCloudStorage` stają się prawdziwe dopiero po udanej operacji magazynu w danym procesie.
- Google ID token jest kryptograficznie sprawdzany w lokalnym trybie serwera. Samo skonfigurowanie OAuth Client ID nie włącza logowania w Cloud Run.
- Nie ma wdrożenia ani zweryfikowanego adresu usługi. Aplikacja Android nie została podłączona do nowej usługi.

## Co jest potrzebne do utworzenia usługi

1. Istniejący identyfikator projektu Google Cloud i konto z uprawnieniem do wdrożenia Cloud Run. Konto Chrome `ai.eskejtpro` musi być dostępne dla tej sesji.
2. Wybór regionu i potwierdzenie stanu rozliczeń. Cloud Run ma bezpłatny limit, ale może naliczać opłaty za użycie ponad limit; budowanie ze źródeł korzysta również z Cloud Build i Artifact Registry. Włączenie rozliczeń lub wdrożenie należy zatwierdzić świadomie.
3. Decyzja, czy powstać ma jedynie prywatna usługa diagnostyczna Cloud Run, czy backend z trwałymi danymi i logowaniem. Kod obsługuje opcjonalny Firestore Standard, ale wymaga jeszcze testu z prawdziwą bazą i decyzji o kosztach. Firestore ma bezpłatną pulę, lecz ponad nią również może kosztować. Alternatywa bez nowego magazynu to pozostawienie trybu lokalnego; nie daje synchronizacji między telefonami.
4. Przed udostępnieniem serwera aplikacji: test restartu procesu, równoległych zapisów, konfliktu rewizji, izolacji kont i wygasania sesji.

## Kontrola kosztów przed wdrożeniem

- Dla pierwszej usługi wybrać rozliczanie za żądania, minimalną liczbę instancji `0` i małą maksymalną liczbę instancji (np. `1`). Zerowe minimum pozwala wygaszać bezczynne instancje; limit maksimum ogranicza skalowanie, ale według Google może zostać chwilowo przekroczony, więc nie jest gwarancją zerowego kosztu.
- Ustawić budżet i alerty dla projektu, lecz nie traktować zwykłego budżetu jako twardego ograniczenia: alerty nie zatrzymują automatycznie naliczania opłat. Jeśli dostępne jest ograniczenie wydatków Cloud Run (funkcja preview), sprawdzić osobno jego zakres; nie obejmuje automatycznie każdego kosztu projektu.
- Przed użyciem Firestore, Cloud Build i Artifact Registry sprawdzić ich osobne limity i koszty. Nie włączać rozliczeń, nie tworzyć bazy ani nie wdrażać usługi, dopóki właściciel projektu nie wybierze akceptowalnego zakresu kosztów.

## Kolejność konfiguracji po podaniu projektu i decyzji kosztowej

1. Otworzyć [Cloud Run w Google Cloud Console](https://console.cloud.google.com/run), zweryfikować konto, projekt, uprawnienia i rozliczenia.
2. Wybrać region. `europe-central2` to Warszawa, ale należy porównać cenę i lokalizację magazynu; ten region jest w cenniku Cloud Run Tier 2.
3. Przygotować wybrany trwały magazyn i bezpieczny dostęp usługi, jeśli celem jest rzeczywiste logowanie i synchronizacja. Dla istniejącej bazy Firestore ustawić `GYMTRACKER_CLOUD_STORE=firestore`, `GYMTRACKER_FIRESTORE_PROJECT_ID` i `GOOGLE_CLIENT_ID`; `GYMTRACKER_FIRESTORE_DATABASE_ID` jest opcjonalne. Nie umieszczać kluczy ani haseł w repozytorium.
4. Wdrożyć usługę Cloud Run ze źródeł repozytorium lub gotowego obrazu. Google Cloud buildpack potrafi uruchomić skrypt `build` z `package.json`; skrypt `start` uruchamia `dist/server.cjs`. Nie otwierać publicznego dostępu, dopóki uwierzytelnianie i magazyn nie przejdą testów.
5. Odczytać nadany HTTPS URL; sprawdzić `/api/health`, `/api/version`, logowanie Google, zapis/odczyt danych i scenariusze restartu. Dopiero po PASS skonfigurować URL w aplikacji i sprawdzić telefon.

## Źródła Google

- [Kontrakt kontenera Cloud Run](https://docs.cloud.google.com/run/docs/container-contract) — `0.0.0.0` i `PORT`.
- [Wdrożenie ze źródeł](https://docs.cloud.google.com/run/docs/deploying-source-code) — Cloud Build, buildpack i Artifact Registry.
- [Buildpack Node.js](https://docs.cloud.google.com/docs/buildpacks/nodejs) — skrypty `build` i `start`.
- [Cennik Cloud Run](https://cloud.google.com/run/pricing) oraz [cennik Firestore](https://cloud.google.com/firestore/pricing) — bezpłatne pule i opłaty ponad limit.
- [Regiony Cloud Run](https://cloud.google.com/run/docs/locations) — dostępność Warszawy.
- [Maksymalna liczba instancji](https://docs.cloud.google.com/run/docs/configuring/max-instances), [minimalna liczba instancji](https://docs.cloud.google.com/run/docs/configuring/min-instances) i [rozliczanie Cloud Run](https://docs.cloud.google.com/run/docs/configuring/billing-settings) — ustawienia skali i płatności.
- [Budżety Google Cloud](https://docs.cloud.google.com/billing/docs/how-to/budgets) i [ograniczenia wydatków](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps) — alerty a ograniczenia, w tym zakres funkcji preview.
