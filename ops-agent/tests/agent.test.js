import test from 'node:test';
import assert from 'node:assert/strict';
import { configuration, maskServiceAccount, overallStatus, redact, statusForError, textReport, timedCheck, validBackendUrl } from '../src/core.js';
import { classifyLog, firestoreMetadataSummary, GoogleReader, metricSummary, serviceSummary, serviceUsageSummary } from '../src/google.js';
import { runDiagnostics } from '../src/diagnostics.js';
import { createServer } from '../src/index.js';

const config = configuration({ OPS_PROJECT_ID: 'gen-lang-client-0836043899', OPS_REGION: 'europe-central2', OPS_TARGET_SERVICE: 'wersja-1--2-od-eskejtpro-git', OPS_FIRESTORE_DATABASE_ID: '(default)', OPS_EXPECTED_VERSION: '3.0.8' });
const service = { uri: 'https://wersja-1--2-od-eskejtpro-git-761415655121.europe-central2.run.app', terminalCondition: { state: 'CONDITION_SUCCEEDED' }, latestCreatedRevision: 'r-2', latestReadyRevision: 'r-2', template: { serviceAccount: 'private@example.iam.gserviceaccount.com', containers: [{ env: [{ name: 'GYMTRACKER_CLOUD_STORE', value: 'secret' }, { name: 'GYMTRACKER_FIRESTORE_PROJECT_ID', value: 'secret' }, { name: 'GOOGLE_CLIENT_ID', value: 'secret' }] }] }, trafficStatuses: [{ revision: 'r-2', percent: 100 }] };
const reader = {
  service: async () => service,
  revisions: async () => ({ revisions: [{ name: 'r-2', terminalCondition: { state: 'CONDITION_SUCCEEDED' } }] }),
  firestore: async () => ({ name: 'projects/p/databases/(default)', locationId: 'europe-central2', type: 'FIRESTORE_NATIVE' }),
  apiStates: async () => ['run.googleapis.com', 'logging.googleapis.com', 'monitoring.googleapis.com', 'firestore.googleapis.com', 'serviceusage.googleapis.com'].map(name => ({ name, state: 'ENABLED' })),
  logging: async () => ({ entries: [] }),
  metrics: async (_, metric) => metric === 'request_count' ? { timeSeries: [{ metric: { labels: { response_code_class: '2xx' } }, points: [{ value: { int64Value: '3' } }] }] } : { timeSeries: [] }
};
const fetcher = async url => {
  const path = new URL(url).pathname;
  if (path === '/api/health') return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
  if (path === '/api/version') return { ok: true, status: 200, json: async () => ({ appVersion: '3.0.8' }) };
  return { ok: true, status: 200, json: async () => ({ googleAuthAvailable: true }) };
};

test('walidacja konfiguracji odrzuca niebezpieczne dane', () => {
  assert.equal(config.databaseId, '(default)');
  assert.throws(() => configuration({ OPS_PROJECT_ID: '../bad', OPS_REGION: 'europe-central2', OPS_TARGET_SERVICE: 'x' }));
  assert.equal(validBackendUrl(service.uri), service.uri);
  for (const url of ['http://127.0.0.1/', 'https://example.com/', 'https://good.run.app@127.0.0.1/', 'https://good.run.app:444/']) assert.throws(() => validBackendUrl(url));
});

test('redakcja usuwa tokeny i e-mail, formatter nie wycieka wartości env', async () => {
  const clean = redact('Authorization: Bearer abc123 id_token=xyz user@example.com');
  assert.doesNotMatch(clean, /abc123|xyz|user@example.com/);
  const report = await runDiagnostics(config, reader, fetcher);
  assert.equal(report.overallStatus, 'WARN');
  assert.equal(report.checks.find(x => x.id === 'persistence').status, 'UNKNOWN');
  assert.doesNotMatch(JSON.stringify(report), /private@example|secret/);
  assert.match(JSON.stringify(report), /private…@example\.iam\.gserviceaccount\.com/);
  assert.match(textReport(report), /GEMINI_API_KEY: brak/);
  assert.match(textReport(report), /PLANPASIKA CLOUD DIAGNOSTICS/);
});

test('klasyfikacja statusów i parsery', () => {
  assert.equal(overallStatus([{ status: 'PASS' }, { status: 'WARN' }]), 'WARN');
  assert.equal(overallStatus([{ status: 'FAIL' }, { status: 'UNKNOWN' }]), 'FAIL');
  assert.equal(overallStatus([{ status: 'UNKNOWN' }]), 'UNKNOWN');
  assert.equal(serviceSummary(service).traffic[0].percent, 100);
  const classified = classifyLog({ textPayload: 'Firestore failed: private health record 987', severity: 'ERROR', httpRequest: { status: 503 } });
  assert.equal(classified.type, 'FIRESTORE_ERROR');
  assert.equal(classified.httpStatus, 503);
  assert.doesNotMatch(JSON.stringify(classified), /private health record|987/);
  assert.equal(metricSummary({ timeSeries: [{ metric: { labels: { response_code_class: '5xx' } }, points: [{ value: { int64Value: '2' } }] }] }, {}, {}).errors5xx, 2);
  assert.equal(firestoreMetadataSummary({ name: 'db', type: 'FIRESTORE_NATIVE' }).type, 'FIRESTORE_NATIVE');
  assert.equal(serviceUsageSummary([{ name: 'run.googleapis.com', state: 'ENABLED' }], ['run.googleapis.com', 'firestore.googleapis.com']).unknown[0].name, 'firestore.googleapis.com');
  assert.equal(maskServiceAccount('planpasika-ops-agent@project.iam.gserviceaccount.com'), 'planpasika-o…@project.iam.gserviceaccount.com');
  assert.equal(statusForError({ status: 403, response: { data: { error: { details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', metadata: { permission: 'datastore.databases.getMetadata' } }] } } } }).summary, 'Brak uprawnienia: datastore.databases.getMetadata.');
});

test('adapter Google używa wyłącznie metod odczytu i wąskiego filtra logów', async () => {
  const seen = [];
  const google = new GoogleReader(async options => { seen.push(options); return { data: options.url.includes('entries:list') ? { entries: [] } : { state: 'ENABLED' } }; });
  await google.service(config);
  await google.revisions(config);
  await google.firestore(config);
  await google.apiStates(config);
  await google.logging(config);
  await google.metrics(config, 'request_count');
  assert.equal(seen.filter(x => x.method === 'POST').length, 1);
  assert.match(JSON.stringify(seen.find(x => x.url.includes('entries:list')).data), /severity>=WARNING/);
  assert.ok(seen.every(x => x.method === 'GET' || x.url.endsWith('/entries:list')));
  assert.ok(seen.every(x => !x.url.includes('/documents/')));
});

test('timeout i częściowa awaria dają raport, nie przerywają całości', async () => {
  const timed = await timedCheck('x', 'X', () => new Promise(() => {}), 10);
  assert.equal(timed.status, 'UNKNOWN');
  const report = await runDiagnostics(config, { ...reader, logging: async () => { throw Object.assign(new Error('permission'), { status: 403 }); } }, fetcher);
  assert.equal(report.checks.find(x => x.id === 'logging').status, 'UNKNOWN');
  assert.equal(report.checks.find(x => x.id === 'health').status, 'PASS');
  const unreachable = await runDiagnostics(config, reader, async () => { throw new Error('connection refused'); });
  assert.equal(unreachable.checks.find(x => x.id === 'health').status, 'FAIL');
});

test('Firestore metadata rozróżnia brak bazy i brak uprawnienia', async () => {
  const missing = await runDiagnostics(config, { ...reader, firestore: async () => { throw Object.assign(new Error('missing'), { response: { status: 404 } }); } }, fetcher);
  assert.equal(missing.checks.find(x => x.id === 'firestore').status, 'FAIL');
  assert.match(missing.checks.find(x => x.id === 'firestore').summary, /Nie znaleziono/);
  const forbidden = await runDiagnostics(config, { ...reader, firestore: async () => { throw Object.assign(new Error('forbidden'), { response: { status: 403, data: { error: { details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', metadata: { permission: 'datastore.databases.getMetadata' } }] } } } }); } }, fetcher);
  const check = forbidden.checks.find(x => x.id === 'firestore');
  assert.equal(check.status, 'UNKNOWN');
  assert.match(check.summary, /datastore\.databases\.getMetadata/);
});

test('HTTP: health, version, raport JSON i brak mutacji', async () => {
  const server = createServer(config, reader, fetcher).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/version`)).status, 200);
    const report = await (await fetch(`${base}/api/diagnostics/run`, { method: 'POST' })).json();
    assert.equal(report.checks.find(x => x.id === 'firestore').status, 'PASS');
    assert.equal((await fetch(`${base}/api/diagnostics/delete`, { method: 'POST' })).status, 404);
  } finally { server.close(); }
});
