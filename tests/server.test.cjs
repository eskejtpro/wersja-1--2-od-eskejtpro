const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.GYMTRACKER_NO_AUTOSTART = '1';

let createApp;
let createPasswordHash;
let tempDir;
let dataFile;
let clock;
let server;
let baseUrl;
let token;

const validData = {
  settings: {},
  weeks: [],
  bodyWeights: [],
  profile: { name: 'Tester', healthBloodworkEntries: [{ id: 'h1', date: '2026-01-01', jsonData: '{"ok":true}' }] },
  catalogExercises: [{ id: 'c1', name: 'Bench', category: 'klatka', defaultSets: 3, defaultReps: 8 }],
};

async function startServer() {
  const result = createApp({
    now: () => clock,
    config: {
      username: 'tester',
      passwordHash: createPasswordHash('correct-password'),
      sessionTtlMs: 1000,
      loginWindowMs: 1000,
      maxLoginAttempts: 3,
      bindHost: '127.0.0.1',
      port: 0,
      dataFile,
    },
  });
  server = result.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function stopServer() {
  if (server) await new Promise((resolve) => server.close(resolve));
  server = undefined;
}

async function request(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

async function login() {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'tester', password: 'correct-password' }),
  });
  assert.equal(result.response.status, 200);
  return result.body.token;
}

test.before(async () => {
  ({ createApp, createPasswordHash } = await import('../server.ts'));
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gymtracker-server-'));
  dataFile = path.join(tempDir, 'nested', 'server-data.json');
  clock = Date.now();
  await startServer();
});

test.after(async () => {
  await stopServer();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('health and version expose persistent-server capabilities', async () => {
  const health = await request('/api/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.version, '3.0.9');
  assert.equal(health.body.apiVersion, '1');
  assert.equal(health.body.capabilities.includes('google_oidc_login'), false);
  assert.equal(health.body.capabilities.includes('google_cloud_server'), false);
  assert.equal(health.body.capabilities.includes('google_account_auth'), false);
  assert.equal(health.response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.response.headers.get('x-dns-prefetch-control'), 'off');
  const version = await request('/api/version');
  assert.equal(version.body.schemaVersion, 1);
  assert.equal(version.body.capabilities.includes('google_oidc_login'), false);
});

test('Cloud Run binds to all interfaces on PORT while local defaults remain loopback-only', () => {
  const oldService = process.env.K_SERVICE;
  const oldPort = process.env.PORT;
  const oldBind = process.env.GYMTRACKER_BIND;
  try {
    delete process.env.K_SERVICE;
    delete process.env.PORT;
    delete process.env.GYMTRACKER_BIND;
    const local = createApp().config;
    assert.equal(local.bindHost, '127.0.0.1');
    assert.equal(local.port, 3000);

    process.env.K_SERVICE = 'planpasika-api';
    process.env.PORT = '8081';
    process.env.GYMTRACKER_BIND = '127.0.0.1';
    const cloud = createApp().config;
    assert.equal(cloud.isCloudRun, true);
    assert.equal(cloud.bindHost, '0.0.0.0');
    assert.equal(cloud.port, 8081);

    process.env.PORT = 'invalid';
    assert.equal(createApp().config.port, 8080);
  } finally {
    if (oldService === undefined) delete process.env.K_SERVICE;
    else process.env.K_SERVICE = oldService;
    if (oldPort === undefined) delete process.env.PORT;
    else process.env.PORT = oldPort;
    if (oldBind === undefined) delete process.env.GYMTRACKER_BIND;
    else process.env.GYMTRACKER_BIND = oldBind;
  }
});

test('Cloud Run reports HTTPS ingress without advertising unavailable cloud storage or login', async () => {
  const { app } = createApp({ config: { isCloudRun: true, bindHost: '0.0.0.0', port: 0 } });
  const cloudServer = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => cloudServer.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${cloudServer.address().port}`;
    const info = await (await fetch(`${url}/api/server/google-info`)).json();
    assert.equal(info.protocol, 'HTTPS');
    assert.equal(info.ssl, 'HTTPS na wejściu Cloud Run');
    assert.equal(info.googleAuthAvailable, false);
    assert.equal(info.durableCloudStorage, false);
    assert.equal(info.cloudStoreConfigured, false);
    assert.equal(info.cloudStoreVerifiedInProcess, false);
    const health = await (await fetch(`${url}/api/health`)).json();
    assert.equal(health.status, 'degraded');
    assert.match((await fetch(`${url}/api/health`)).headers.get('strict-transport-security') || '', /max-age=/);
    assert.equal(health.capabilities.includes('google_cloud_server'), false);
    assert.equal(health.capabilities.includes('google_account_auth'), false);
    assert.equal(health.capabilities.includes('auth_session'), false);
    assert.equal(health.capabilities.includes('sync_status'), false);
  } finally {
    await new Promise((resolve) => cloudServer.close(resolve));
  }
});

test('health audit is explicitly unavailable without AI and never claims normal results', async () => {
  const oldGeminiKey = process.env.GEMINI_API_KEY;
  const oldApiKey = process.env.API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.API_KEY;
  try {
    const result = await request('/api/ai/coach/audit-health', {
      method: 'POST',
      body: JSON.stringify({ bloodTests: [{ name: 'ALT', value: 900, unit: 'U/L' }], bodyWeight: 80 }),
    });
    assert.equal(result.response.status, 503);
    assert.equal(result.body.error, 'ai_unavailable');
    assert.equal('auditText' in result.body, false);
    assert.doesNotMatch(JSON.stringify(result.body), /normach|stabilne|mieszczą się/i);
    const invalid = await request('/api/ai/coach/audit-health', {
      method: 'POST', body: JSON.stringify({ bloodTests: 'not-an-array', bodyWeight: 80 }),
    });
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.error, 'invalid_health_audit_input');
    for (const bloodTests of [
      [null],
      [{ testName: 'ALT', value: { secret: 'ignored' } }],
      [{ testName: 'ALT', value: 30, minNormal: 40, maxNormal: 20 }],
      Array.from({ length: 51 }, (_, i) => ({ testName: `T${i}`, value: i })),
    ]) {
      const malformedRow = await request('/api/ai/coach/audit-health', {
        method: 'POST', body: JSON.stringify({ bloodTests, bodyWeight: 80 }),
      });
      assert.equal(malformedRow.response.status, 400);
      assert.equal(malformedRow.body.error, 'invalid_health_audit_input');
    }
  } finally {
    if (oldGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldGeminiKey;
    if (oldApiKey === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = oldApiKey;
  }
});

test('login, logout, TTL and rate limiting are enforced', async () => {
  const bad = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'tester', password: 'wrong' }) });
  assert.equal(bad.response.status, 401);
  token = await login();
  const loggedOut = await request('/api/auth/logout', { method: 'POST', headers: { authorization: `Bearer ${token}` } });
  assert.equal(loggedOut.response.status, 204);
  assert.equal((await request('/api/data', { headers: { authorization: `Bearer ${token}` } })).response.status, 401);
  token = await login();
  clock += 1001;
  assert.equal((await request('/api/data', { headers: { authorization: `Bearer ${token}` } })).response.status, 401);
  for (let i = 0; i < 3; i += 1) {
    const failed = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'tester', password: 'wrong' }) });
    assert.ok([401, 429].includes(failed.response.status));
  }
  assert.equal((await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'tester', password: 'correct-password' }) })).response.status, 429);
  clock += 1001;
});

test('data writes atomically, preserve fields and survive a new app instance', async () => {
  token = await login();
  const headers = { authorization: `Bearer ${token}` };
  const saved = await request('/api/data', { method: 'POST', headers, body: JSON.stringify({ schemaVersion: 1, data: validData }) });
  assert.equal(saved.response.status, 201);
  assert.equal(saved.body.revision, 1);
  assert.equal(saved.body.contentHash.length, 64);
  assert.equal(fs.existsSync(dataFile), true);
  assert.equal(fs.readdirSync(path.dirname(dataFile)).some((name) => name.endsWith('.tmp')), false);
  await stopServer();
  await startServer();
  token = await login();
  const loaded = await request('/api/data', { headers: { authorization: `Bearer ${token}` } });
  assert.equal(loaded.response.status, 200);
  assert.deepEqual(loaded.body.data.profile, validData.profile);
  assert.deepEqual(loaded.body.data.catalogExercises, validData.catalogExercises);
  assert.equal(loaded.body.revision, 1);
});

test('corrupt data file returns controlled unavailable responses', async () => {
  await stopServer();
  fs.writeFileSync(dataFile, '{"revision":');
  await startServer();
  token = await login();
  const health = await request('/api/health');
  assert.equal(health.body.status, 'degraded');
  const loaded = await request('/api/data', { headers: { authorization: `Bearer ${token}` } });
  assert.equal(loaded.response.status, 503);
  assert.deepEqual(loaded.body, { error: 'data_store_unavailable' });
  fs.rmSync(dataFile, { force: true });
  await stopServer();
  await startServer();
  token = await login();
});

test('revision and content hash prevent stale overwrites', async () => {
  const headers = { authorization: `Bearer ${token}` };
  const first = await request('/api/data', { method: 'POST', headers, body: JSON.stringify({ schemaVersion: 1, data: validData }) });
  assert.equal(first.response.status, 201);
  const conflict = await request('/api/data', {
    method: 'POST',
    headers,
    body: JSON.stringify({ schemaVersion: 1, revision: 1, contentHash: '0'.repeat(64), data: validData }),
  });
  assert.equal(conflict.response.status, 409);
  assert.equal(conflict.body.error, 'conflict');
  const missingRevision = await request('/api/data', { method: 'POST', headers, body: JSON.stringify({ schemaVersion: 1, data: validData }) });
  assert.equal(missingRevision.response.status, 409);
});

test('agent is local heuristic and makes no outgoing request', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async (...args) => {
    fetchCalls += 1;
    return originalFetch(...args);
  };
  try {
    const response = await fetch(`${baseUrl}/api/agent/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ weeks: [], query: 'test' }),
    });
    const body = await response.json();
    assert.equal(body.mode, 'heuristic_local');
    assert.equal(body.provider, 'local_heuristic');
    assert.equal(body.externalCalls, false);
    assert.equal(fetchCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('invalid update manifest is unavailable and update actions do not simulate success', async () => {
  const manifestPath = path.join(tempDir, 'invalid-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify([{ version: '2.25.0', packageUrl: 'https://example.invalid/pkg.zip', sha256: 'invalid', sizeBytes: 1, minSupportedVersion: '2.24.0' }]));
  const result = createApp({ config: { dataFile, updateManifestPath: manifestPath } });
  const manifestServer = result.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => manifestServer.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${manifestServer.address().port}/api/update/check`);
    const body = await response.json();
    assert.equal(body.status, 'unavailable_not_configured');
    const download = await fetch(`http://127.0.0.1:${manifestServer.address().port}/api/update/download/2.25.0`);
    assert.equal(download.status, 503);
  } finally {
    await new Promise((resolve) => manifestServer.close(resolve));
  }
});

test('malformed JSON and localhost binding are handled', async () => {
  const malformed = await fetch(`${baseUrl}/api/health`, { method: 'POST', body: '{' });
  assert.notEqual(malformed.status, 500);
  assert.equal(server.address().address, '127.0.0.1');
});

test('request body limit rejects oversized JSON safely', async () => {
  const limited = createApp({ config: { dataFile, maxBodyBytes: '1kb' } });
  const limitedServer = limited.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => limitedServer.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${limitedServer.address().port}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'tester', password: 'x'.repeat(5000) }),
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: 'body_too_large' });
  } finally {
    await new Promise((resolve) => limitedServer.close(resolve));
  }
});

test('SERWER GOOGLE CLOUD: Pobranie szczegółów serwera, adresu, regionu i instrukcji dla wielu użytkowników', async () => {
  const res = await request('/api/server/google-info');
  assert.equal(res.response.status, 200);
  assert.equal(res.body.provider, 'local');
  assert.equal(res.body.status, 'online');
  assert.equal(res.body.pairingCode, '');
  assert.equal(res.body.sharedUrl, '');
  assert.equal(res.body.googleAuthAvailable, false);
  assert.equal(res.body.durableCloudStorage, false);
  assert.ok(res.body.instructions);
  assert.ok(Array.isArray(res.body.instructions.steps));
  assert.ok(res.body.instructions.steps.length >= 2);
});

test('Google login refuses client-supplied profile claims when OAuth is not configured', async () => {
  const loginRes = await request('/api/auth/google/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'eskejtpro@gmail.com',
      displayName: 'Forged user'
    })
  });
  assert.equal(loginRes.response.status, 503);
  assert.deepEqual(loginRes.body, { error: 'google_auth_not_configured' });
  assert.equal((await request('/api/auth/google/user')).response.status, 401);
  assert.equal((await request('/api/auth/google/logout', { method: 'POST' })).response.status, 401);
});

