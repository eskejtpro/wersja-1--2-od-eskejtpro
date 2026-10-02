const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { OAuth2Client } = require('google-auth-library');

process.env.GYMTRACKER_NO_AUTOSTART = '1';

const client = new OAuth2Client();
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const certificates = { 'test-key': publicKey.export({ type: 'spki', format: 'pem' }).toString() };
const audience = 'gymtracker-test-web-client';

function createIdToken(overrides = {}, signingKey = privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'test-key' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: 'https://accounts.google.com',
    aud: audience,
    sub: 'google-subject-1',
    iat: now,
    exp: now + 3600,
    email: 'tester@example.com',
    email_verified: true,
    name: 'Verified Tester',
    picture: 'https://example.com/tester.png',
    ...overrides,
  })).toString('base64url');
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), signingKey).toString('base64url');
  return `${signingInput}.${signature}`;
}

async function verifyTestToken(idToken, audiences) {
  const ticket = await client.verifySignedJwtWithCertsAsync(
    idToken,
    certificates,
    audiences,
    ['accounts.google.com', 'https://accounts.google.com'],
    3600,
  );
  const payload = ticket.getPayload();
  return {
    sub: payload.sub,
    email: payload.email,
    displayName: payload.name,
    ...(payload.picture ? { photoURL: payload.picture } : {}),
  };
}

async function startAuthServer({ isCloudRun = false } = {}) {
  const { createApp } = await import('../server.ts');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gymtracker-google-auth-'));
  const app = createApp({
    config: {
      bindHost: '127.0.0.1',
      port: 0,
      dataFile: path.join(dataDir, 'server-data.json'),
      googleClientIds: [audience],
      allowedOrigins: ['https://app.example.test'],
      isCloudRun,
    },
    verifyGoogleIdToken: verifyTestToken,
  });
  const server = app.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return {
    dataDir,
    server,
    url: `http://127.0.0.1:${server.address().port}`,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

async function postJson(baseUrl, route, body, token) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

test('Google verifier rejects an invalid signature, wrong audience, expired token and unsupported issuer', async () => {
  const wrongKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  await assert.rejects(verifyTestToken(createIdToken({}, wrongKey.privateKey), [audience]));
  await assert.rejects(verifyTestToken(createIdToken({ aud: 'attacker-client' }), [audience]));
  await assert.rejects(verifyTestToken(createIdToken({ exp: 1, iat: 0 }), [audience]));
  await assert.rejects(verifyTestToken(createIdToken({ iss: 'https://attacker.example' }), [audience]));
});

test('Google login rejects missing or forged identity claims and protects profile and logout routes', async () => {
  const app = await startAuthServer();
  try {
    const missing = await postJson(app.url, '/api/auth/google/login', {
      email: 'forged@example.com',
      displayName: 'Forged User',
    });
    assert.equal(missing.response.status, 400);
    assert.deepEqual(missing.body, { error: 'google_id_token_required' });

    const invalid = await postJson(app.url, '/api/auth/google/login', {
      idToken: createIdToken({}, crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey),
      email: 'forged@example.com',
      displayName: 'Forged User',
    });
    assert.equal(invalid.response.status, 401);
    assert.equal((await fetch(`${app.url}/api/auth/google/user`)).status, 401);
    assert.equal((await fetch(`${app.url}/api/auth/google/logout`, { method: 'POST' })).status, 401);
  } finally {
    await app.close();
  }
});

test('verified Google sub owns an isolated data file and logout revokes only that session', async () => {
  const app = await startAuthServer();
  try {
    const one = await postJson(app.url, '/api/auth/google/login', {
      idToken: createIdToken({ sub: 'google-user-one', email: 'one@example.com', name: 'User One' }),
      email: 'ignored@example.com',
      displayName: 'Unverified Name',
    });
    const two = await postJson(app.url, '/api/auth/google/login', {
      idToken: createIdToken({ sub: 'google-user-two', email: 'two@example.com', name: 'User Two' }),
    });
    assert.equal(one.response.status, 200);
    assert.equal(two.response.status, 200);
    assert.equal(one.body.user.sub, 'google-user-one');
    assert.equal(one.body.user.email, 'one@example.com');
    assert.equal(one.body.user.displayName, 'User One');

    const dataOne = { settings: { owner: 'one' }, weeks: [], bodyWeights: [] };
    const dataTwo = { settings: { owner: 'two' }, weeks: [], bodyWeights: [] };
    const read = async (token) => fetch(`${app.url}/api/data`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal((await read(one.body.token)).status, 404);

    const saveOne = await postJson(app.url, '/api/data', { schemaVersion: 1, data: dataOne }, one.body.token);
    const saveTwo = await postJson(app.url, '/api/data', { schemaVersion: 1, data: dataTwo }, two.body.token);
    assert.equal(saveOne.response.status, 201);
    assert.equal(saveTwo.response.status, 201);
    assert.equal((await (await read(one.body.token)).json()).data.settings.owner, 'one');
    assert.equal((await (await read(two.body.token)).json()).data.settings.owner, 'two');
    assert.equal(fs.readdirSync(path.join(app.dataDir, 'accounts')).length, 2);

    const logout = await fetch(`${app.url}/api/auth/google/logout`, {
      method: 'POST', headers: { authorization: `Bearer ${one.body.token}` },
    });
    assert.equal(logout.status, 204);
    assert.equal((await read(one.body.token)).status, 401);
    assert.equal((await read(two.body.token)).status, 200);
  } finally {
    await app.close();
  }
});

test('Cloud Run refuses authentication and user data without a durable backend', async () => {
  const app = await startAuthServer({ isCloudRun: true });
  try {
    const login = await postJson(app.url, '/api/auth/google/login', { idToken: createIdToken() });
    assert.equal(login.response.status, 503);
    assert.deepEqual(login.body, { error: 'session_store_not_configured' });
    const data = await fetch(`${app.url}/api/data`);
    assert.equal(data.status, 401);
    const health = await fetch(`${app.url}/api/health`);
    assert.equal((await health.json()).status, 'degraded');
  } finally {
    await app.close();
  }
});
