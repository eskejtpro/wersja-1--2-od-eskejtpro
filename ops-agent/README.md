# PlanPasika Cloud Ops Agent V1

Osobna, diagnostyczna usługa Cloud Run. Pobiera wyłącznie konfigurację infrastruktury i metadane, bez logowania do kont użytkowników i bez modyfikacji produkcji. Wyniki są po polsku. Nie sprawdza danych treningowych ani nie potwierdza synchronizacji na telefonie.

## Lokalnie

W katalogu `ops-agent` uruchom `npm ci`, `npm test`, `npm run build`. Testy jednostkowe używają mocków i nie łączą się z Google Cloud. Uruchomienie serwera wymaga `OPS_PROJECT_ID`, `OPS_REGION`, `OPS_TARGET_SERVICE`; opcjonalne są `OPS_FIRESTORE_DATABASE_ID=(default)` i `OPS_EXPECTED_VERSION`. Żadnych wartości OAuth ani kluczy nie zapisuj w repo.

Endpointy: `GET /health`, `GET /version`, `POST /api/diagnostics/run`. Dla raportu tekstowego ustaw `Accept: text/plain`; domyślnie otrzymasz JSON. Ciało requestu nie wybiera projektu ani URL. Wszystkie żądania odczytowe Google używają Application Default Credentials. `POST /api/diagnostics/run` uruchamia tylko odczyty, nie jest operacją zmieniającą Cloud.

Raport osobno pokazuje Cloud Run Ready, rewizję, HTTP health, wersję, konfigurację Google Auth, metadane Firestore, logi, metryki oraz `UNKNOWN` dla trwałości danych i synchronizacji klienta. `/api/health` produktu oraz `durableCloudStorage` nie są dowodem trwałości GymData. Bez rzeczywistego testu danych V1 pozostawia te pola `UNKNOWN`.

## Wdrożenie V1

1. Potwierdź aktualny projekt, region, nazwę backendu i koszty Cloud Run, Cloud Logging oraz Monitoring. Dane z rozmowy: `gen-lang-client-0836043899`, `europe-central2`, `wersja-1--2-od-eskejtpro-git`.
2. Użyj dedykowanego konta `planpasika-ops-agent@gen-lang-client-0836043899.iam.gserviceaccount.com` z rolami wyłącznie do odczytu z [IAM-REQUIRED.md](IAM-REQUIRED.md); nie używaj konta backendu ani klucza JSON.
3. Zbuduj z katalogu `ops-agent` obraz z [Dockerfile](Dockerfile). Wdróż go jako **osobną prywatną usługę** `planpasika-cloud-ops` w `europe-central2`, ustawiając `OPS_PROJECT_ID`, `OPS_REGION`, `OPS_TARGET_SERVICE`, `OPS_FIRESTORE_DATABASE_ID=(default)` oraz `OPS_EXPECTED_VERSION=3.0.8`. Nie zmieniaj istniejącej usługi `planpasika-ops-agent` ani backendu produktu. Nie włączaj dostępu nieuwierzytelnionego; zachowaj minimum instancji 0 i limit maksimum 2.
4. `roles/run.invoker` na nowej usłudze nadaj wyłącznie `ai.eskejtpro@gmail.com`. Zweryfikuj, że anonimowy request jest odrzucony, a uwierzytelniony operator może pobrać `/health`, `/version` i raport diagnostyczny.

Przykładowa komenda wdrożenia, **nie wykonywana przez agenta** (zamień wartości po ponownej weryfikacji):

```bash
gcloud run deploy planpasika-cloud-ops --source . --region=europe-central2 --project=gen-lang-client-0836043899 --service-account=planpasika-ops-agent@gen-lang-client-0836043899.iam.gserviceaccount.com --no-allow-unauthenticated --min=0 --max=2 --set-env-vars=OPS_PROJECT_ID=gen-lang-client-0836043899,OPS_REGION=europe-central2,OPS_TARGET_SERVICE=wersja-1--2-od-eskejtpro-git,OPS_FIRESTORE_DATABASE_ID='(default)',OPS_EXPECTED_VERSION=3.0.8
```

Jeżeli wdrażasz ze źródeł, sprawdź, czy wybrana ścieżka budowania honoruje Dockerfile w `ops-agent`; alternatywnie zbuduj obraz z tego katalogu i wdróż obraz. Nie wdrażaj katalogu głównego produktu jako Ops Agent.

## Ograniczenia i dalsze wersje

Live Google Cloud nie jest weryfikowany przez testy jednostkowe. Metryki mogą być opóźnione lub nieobecne przy małym ruchu. Na V2 pozostają alerty Cloud Monitoring, okresowy check, historia raportów i powiadomienia. V3 może przygotowywać propozycje zmian, ale każda wymaga osobnej autoryzacji i weryfikacji; V1 nie ma wykonawcy zmian.
