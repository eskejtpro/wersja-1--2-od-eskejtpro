# Uprawnienia PlanPasika Cloud Ops Agent V1

Potwierdzona konfiguracja: projekt `gen-lang-client-0836043899`, region `europe-central2`, usługa backendu `wersja-1--2-od-eskejtpro-git`. Konto `planpasika-ops-agent@gen-lang-client-0836043899.iam.gserviceaccount.com` już istnieje i jest dedykowane dla usług Ops Agent; można użyć go dla osobnej usługi `planpasika-cloud-ops`. Nie używaj konta backendu ani klucza JSON.

Role wymagane do odczytu:

| Rola | Cel |
| --- | --- |
| `roles/run.viewer` | Usługa, rewizje, ruch i nazwy konfiguracji Cloud Run |
| `roles/logging.viewer` | Ograniczony odczyt wpisów Cloud Logging |
| `roles/monitoring.viewer` | Szeregi czasowe Cloud Monitoring |
| `roles/serviceusage.serviceUsageViewer` | Status wymaganych API |

Firestore: preferowana niestandardowa rola metadanych z `datastore.databases.getMetadata` (odczyt konfiguracji bazy) i `resourcemanager.projects.get`. Nie jest potrzebne `datastore.entities.get`, `datastore.entities.list`, `roles/datastore.viewer` ani uprawnienie zapisu. Weryfikuj zestaw uprawnień w aktualnej dokumentacji przed utworzeniem roli. Agent nie tworzy roli i nie odczytuje dokumentów użytkowników.

Usługa Ops Agent `planpasika-cloud-ops` ma być prywatna. Operator `ai.eskejtpro@gmail.com` potrzebuje `roles/run.invoker` na **tej usłudze Ops Agent**, nie na backendzie produktu. Konto usługi Ops Agenta nie potrzebuje roli administratora. Istniejąca `planpasika-ops-agent` pozostaje nietknięta.

Nie wymagaj i nie nadaj agentowi `roles/owner`, `roles/editor`, `roles/run.admin`, `roles/datastore.admin`, `roles/secretmanager.secretAccessor` ani `roles/iam.serviceAccountTokenCreator`. Żadne role nie są nadawane przez kod V1.

Źródła Google: [Cloud Run IAM](https://cloud.google.com/run/docs/securing/managing-access), [Firestore IAM](https://docs.cloud.google.com/firestore/native/docs/security/iam), [Firestore database metadata](https://docs.cloud.google.com/firestore/native/docs/manage-databases).
