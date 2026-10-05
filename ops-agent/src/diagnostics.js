import { API_NAMES, OPTIONAL_ENVS, REQUIRED_ENVS, overallStatus, timedCheck, validBackendUrl } from './core.js';
import { classifyLog, firestoreMetadataSummary, metricSummary, serviceSummary, serviceUsageSummary } from './google.js';

async function runLimited(tasks, limit = 4) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (true) {
      const index = next++;
      if (index >= tasks.length) return;
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

async function getJson(baseUrl, path, fetcher) {
  const url = new URL(path, `${baseUrl}/`);
  try {
    const response = await fetcher(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(6500), headers: { accept: 'application/json' } });
    if (!response.ok) return { code: response.status, body: null };
    const body = await response.json();
    return { code: response.status, body };
  } catch { return { code: 0, body: null }; }
}

export async function runDiagnostics(config, reader, fetcher = fetch) {
  const started = Date.now();
  const servicePromise = reader.service(config).then(serviceSummary);
  const checks = await runLimited([
    () => timedCheck('cloud_run', 'Cloud Run', async () => {
      const s = await servicePromise;
      return { status: s.ready ? 'PASS' : 'FAIL', summary: s.ready ? 'Usługa Cloud Run jest gotowa.' : 'Usługa Cloud Run nie osiągnęła stanu Ready.', evidence: [`Generacja: ${s.generation || 'brak danych'}`, `Utworzono: ${s.created || 'brak danych'}`, `Aktualizacja: ${s.updated || 'brak danych'}`, `Tożsamość usługi: ${s.serviceAccount || 'brak'}`], nextStep: s.ready ? undefined : 'Sprawdź logi najnowszej rewizji.' };
    }),
    () => timedCheck('revision', 'Rewizje i ruch', async () => {
      const s = await servicePromise;
      const listed = (await reader.revisions(config)).revisions || [];
      const newest = listed[0];
      const newestReady = newest?.conditions?.some(x => (x.type === 'Ready' || x.type === 'ContainerHealthy') && x.state === 'CONDITION_SUCCEEDED') || newest?.terminalCondition?.state === 'CONDITION_SUCCEEDED';
      const different = Boolean(s.latestCreated && s.latestReady && s.latestCreated !== s.latestReady);
      return { status: different || (newest && !newestReady) ? 'WARN' : s.latestReady ? 'PASS' : 'UNKNOWN', summary: different || (newest && !newestReady) ? 'Najnowsza rewizja wymaga sprawdzenia.' : 'Ostatnia rewizja i ruch są gotowe.', evidence: [`Utworzona: ${s.latestCreated || 'brak danych'}`, `Gotowa: ${s.latestReady || 'brak danych'}`, `Najnowsza z listy: ${newest?.name || 'brak danych'}`, `Najnowsza Ready: ${newest ? newestReady ? 'tak' : 'nie' : 'nieznane'}`, ...s.traffic.map(t => `Ruch ${t.percent}% → ${t.revision || 'najnowsza'}`)], nextStep: different || (newest && !newestReady) ? 'Sprawdź logi ostatniej rewizji.' : undefined };
    }),
    () => timedCheck('configuration', 'Konfiguracja backendu', async () => {
      const s = await servicePromise;
      const missing = REQUIRED_ENVS.filter(name => !s.envNames.includes(name));
      return { status: missing.length ? 'WARN' : 'PASS', summary: missing.length ? 'Brakuje części nazw zmiennych konfiguracji.' : 'Wymagane nazwy zmiennych są obecne.', evidence: [...REQUIRED_ENVS, ...OPTIONAL_ENVS].map(name => `${name}: ${s.envNames.includes(name) ? 'skonfigurowano' : 'brak'}`), nextStep: missing.length ? 'Sprawdź konfigurację najnowszej rewizji. Wartości nie są odczytywane przez agenta.' : undefined };
    }),
    () => timedCheck('health', 'HTTP backendu', async () => {
      const s = await servicePromise;
      const endpoint = validBackendUrl(s.url);
      const result = await getJson(endpoint, '/api/health', fetcher);
      return { status: result.code === 200 ? result.body?.status === 'ok' ? 'PASS' : 'WARN' : 'FAIL', summary: result.code === 200 ? `Backend odpowiada; status aplikacji: ${result.body?.status || 'nieznany'}.` : result.code ? `Backend zwrócił HTTP ${result.code}.` : 'Backend nie odpowiada na /api/health.', evidence: [`HTTP ${result.code || 'brak odpowiedzi'}`], nextStep: result.code !== 200 ? 'Sprawdź logi i konfigurację backendu.' : undefined };
    }),
    () => timedCheck('version', 'Wersja API', async () => {
      const s = await servicePromise;
      const result = await getJson(validBackendUrl(s.url), '/api/version', fetcher);
      const actual = result.body?.appVersion || '';
      const mismatch = config.expectedVersion && actual !== config.expectedVersion;
      return { status: result.code !== 200 ? 'FAIL' : mismatch ? 'WARN' : 'PASS', summary: mismatch ? 'Wersja wdrożona różni się od oczekiwanej.' : result.code === 200 ? 'Odczytano wersję backendu.' : 'Nie można odczytać wersji backendu.', evidence: [`HTTP ${result.code}`, `Wdrożona: ${actual || 'brak'}`, `Oczekiwana: ${config.expectedVersion || 'nie ustawiono'}`] };
    }),
    () => timedCheck('google_auth', 'Konfiguracja Google Auth', async () => {
      const s = await servicePromise;
      const result = await getJson(validBackendUrl(s.url), '/api/server/google-info', fetcher);
      const configured = result.body?.googleAuthAvailable === true;
      return { status: result.code !== 200 ? 'UNKNOWN' : configured ? 'PASS' : 'WARN', summary: configured ? 'Backend raportuje konfigurację Google Auth; logowanie użytkownika nie zostało przetestowane.' : 'Backend nie potwierdza gotowości Google Auth.', evidence: [`HTTP ${result.code}`] };
    }),
    () => timedCheck('firestore', 'Metadane Firestore', async () => {
      const d = firestoreMetadataSummary(await reader.firestore(config));
      return { status: d.name ? 'PASS' : 'UNKNOWN', summary: d.name ? 'Baza istnieje. Trwałość danych użytkowników pozostaje niezweryfikowana.' : 'Brak danych o bazie.', evidence: [`Baza: ${config.databaseId}`, `Region: ${d.locationId || 'brak'}`, `Typ: ${d.type || 'brak'}`, `Tryb współbieżności: ${d.concurrencyMode || 'brak'}`, `Ochrona usuwania: ${d.deleteProtectionState || 'brak'}`, `PITR: ${d.pointInTimeRecoveryEnablement || 'brak'}`] };
    }),
    () => timedCheck('service_usage', 'Wymagane API', async () => {
      const { states, disabled, unknown } = serviceUsageSummary(await reader.apiStates(config));
      return { status: disabled.length ? 'FAIL' : unknown.length ? 'WARN' : 'PASS', summary: disabled.length ? 'Część wymaganych API jest wyłączona.' : unknown.length ? 'Nie wszystkie API można zweryfikować.' : 'Wymagane API są aktywne.', evidence: API_NAMES.map(name => `${name}: ${states.find(x => x.name === name)?.state || 'UNKNOWN'}`), nextStep: disabled.length ? 'Włącz brakujące API po osobnej decyzji administratora.' : unknown.length ? 'Sprawdź rolę Service Usage Viewer.' : undefined };
    }),
    () => timedCheck('logging', 'Błędy w logach', async () => {
      const entries = (await reader.logging(config)).entries || [];
      const grouped = entries.map(classifyLog).reduce((acc, x) => { (acc[x.type] ||= []).push(x); return acc; }, {});
      return { status: entries.length ? 'WARN' : 'PASS', summary: entries.length ? `Znaleziono ${entries.length} ostrzeżeń lub błędów w ostatnich 15 minutach.` : 'Brak ostrzeżeń i błędów w ostatnich 15 minutach.', evidence: Object.entries(grouped).map(([type, list]) => `${type}: ${list.length}`), nextStep: entries.length ? 'Otwórz Cloud Logging i sprawdź zanonimizowane kategorie.' : undefined };
    }),
    () => timedCheck('metrics', 'Metryki Cloud Run', async () => {
      const [requests, instances, latencies] = await Promise.all([
        reader.metrics(config, 'request_count'), reader.metrics(config, 'container/instance_count'), reader.metrics(config, 'request_latencies')
      ]);
      const m = metricSummary(requests, instances, latencies);
      return { status: m.requests === 0 ? 'UNKNOWN' : m.errors5xx > 0 ? 'WARN' : 'PASS', summary: m.requests === 0 ? 'Brak próbek żądań w ostatnich 15 minutach.' : `Żądania: ${m.requests}; 5xx: ${m.errors5xx}.`, evidence: [`5xx: ${m.errorRate === null ? 'brak próbek' : `${(m.errorRate * 100).toFixed(1)}%`}`, `Aktywne instancje (maks. próbka): ${m.activeInstances ?? 'brak próbek'}`, `Średnie opóźnienie: ${m.meanLatencyMs === null ? 'brak danych' : `${m.meanLatencyMs.toFixed(1)} ms`}`, 'P95: nieobliczane w V1'], nextStep: m.errors5xx ? 'Sprawdź logi rewizji dla odpowiedzi 5xx.' : undefined };
    }),
    () => timedCheck('persistence', 'Trwałość danych użytkownika', async () => ({ status: 'UNKNOWN', summary: 'Nie wykonano testu zapisu i odczytu danych użytkownika.', evidence: ['Metadane Firestore nie dowodzą trwałości GymData.'] })),
    () => timedCheck('client_sync', 'Synchronizacja klienta', async () => ({ status: 'UNKNOWN', summary: 'Nie wykonano testu synchronizacji na dwóch urządzeniach.', evidence: [] }))
  ]);
  return { generatedAt: new Date().toISOString(), projectId: config.projectId, region: config.region, targetService: config.service, overallStatus: overallStatus(checks), checks, warnings: checks.filter(x => x.status !== 'PASS').map(x => `${x.name}: ${x.summary}`), durationMs: Date.now() - started };
}
