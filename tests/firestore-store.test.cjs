const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.GYMTRACKER_NO_AUTOSTART = '1';

let FirestoreStore;
let CloudConflictError;
let CloudStoreError;
let createApp;

test.before(async () => {
  ({ FirestoreStore, CloudConflictError, CloudStoreError } = await import('../server/data/firestoreStore.ts'));
  ({ createApp } = await import('../server.ts'));
});

function httpError(status, reason) {
  const error = new Error(reason);
  error.response = { status, data: { error: { status: reason } } };
  return error;
}

function fakeFirestore() {
  const documents = new Map();
  let version = 0;
  let pendingCommits = 0;
  let releaseCommits;
  let holdCommits = false;
  let failRequests = false;
  const request = async ({ url, method, data }) => {
    if (failRequests) throw httpError(503, 'UNAVAILABLE');
    if (method === 'GET') {
      const name = url.replace('https://firestore.googleapis.com/v1/', '');
      const document = documents.get(name);
      if (!document) throw httpError(404, 'NOT_FOUND');
      return { data: structuredClone(document) };
    }
    assert.equal(method, 'POST');
    assert.match(url, /documents:commit$/);
    if (holdCommits) {
      pendingCommits += 1;
      if (pendingCommits === 1) await new Promise((resolve) => { releaseCommits = resolve; });
      else releaseCommits();
    }
    for (const write of data.writes) {
      if (write.update) {
        const name = write.update.name;
        const current = documents.get(name);
        if (write.currentDocument?.exists === false && current) throw httpError(409, 'FAILED_PRECONDITION');
        if (write.currentDocument?.updateTime && current?.updateTime !== write.currentDocument.updateTime) {
          throw httpError(409, 'FAILED_PRECONDITION');
        }
        version += 1;
        documents.set(name, { updateTime: new Date(Date.UTC(2026, 9, 2, 0, 0, 0, version)).toISOString(), fields: write.update.fields });
      } else if (write.delete) {
        documents.delete(write.delete);
      }
    }
    return { data: { commitTime: new Date().toISOString() } };
  };
  return {
    documents, request,
    set holdCommits(value) { holdCommits = value; pendingCommits = 0; },
    set failRequests(value) { failRequests = value; },
  };
}

const validateData = (value) => Boolean(value && typeof value === 'object'
  && value.settings && Array.isArray(value.weeks) && Array.isArray(value.bodyWeights));
const data = (owner) => ({ settings: { owner }, weeks: [], bodyWeights: [] });
const makeStore = (fake, now = () => Date.UTC(2026, 9, 2)) => new FirestoreStore({
  projectId: 'planpasika-test', requester: fake.request, validateData, now,
});

test('Firestore data survives a new store instance and remains isolated by verified principal', async () => {
  const fake = fakeFirestore();
  const first = makeStore(fake);
  const saved = await first.saveData('google:subject-one', data('one'));
  assert.equal(saved.revision, 1);
  await assert.rejects(first.saveData('google:subject-one', data('missing-revision')),
    (error) => error instanceof CloudConflictError && error.reason === 'revision_required');
  assert.equal((await makeStore(fake).readData('google:subject-one')).data.settings.owner, 'one');
  assert.equal(await makeStore(fake).readData('google:subject-two'), null);
  const [documentName] = fake.documents.keys();
  assert.doesNotMatch(documentName, /subject-one/);
  assert.match(documentName, /gymtracker_v1_data\/[a-f0-9]{64}$/);
  const updated = await first.saveData('google:subject-one', data('updated'), saved.revision, saved.contentHash);
  assert.equal(updated.revision, 2);
  assert.equal((await makeStore(fake).readData('google:subject-one')).data.settings.owner, 'updated');
});

test('Firestore preconditions prevent two concurrent stale writes from overwriting each other', async () => {
  const fake = fakeFirestore();
  const first = makeStore(fake);
  const second = makeStore(fake);
  const initial = await first.saveData('google:subject', data('original'));
  fake.holdCommits = true;
  const results = await Promise.allSettled([
    first.saveData('google:subject', data('writer-one'), initial.revision, initial.contentHash),
    second.saveData('google:subject', data('writer-two'), initial.revision, initial.contentHash),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.ok(rejected.reason instanceof CloudConflictError);
  assert.equal(rejected.reason.revision, 2);
  const current = await makeStore(fake).readData('google:subject');
  assert.equal(current.revision, 2);
  assert.ok(['writer-one', 'writer-two'].includes(current.data.settings.owner));
});

test('client-side CloudStoreError does not mark Firestore unavailable', async () => {
  const fake = fakeFirestore();
  const store = makeStore(fake);
  store.saveData = async () => { throw new CloudStoreError('body_too_large', 413); };
  const { app } = createApp({
    config: { isCloudRun: true, bindHost: '127.0.0.1', googleClientIds: ['test-client'] },
    firestoreStore: store,
    verifyGoogleIdToken: async () => ({ sub: 'test-subject', email: 'test@example.invalid', displayName: 'Test' }),
  });
  const listener = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => listener.once('listening', resolve));
  const base = `http://127.0.0.1:${listener.address().port}`;
  try {
    const login = await fetch(`${base}/api/auth/google/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: 'signed-id-token' }),
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const diagnostic = await fetch(`${base}/api/diagnostics/firestore`, {
      method: 'POST', headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(diagnostic.status, 200);
    const response = await fetch(`${base}/api/data`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ schemaVersion: 1, data: data('synthetic') }),
    });
    assert.equal(response.status, 413);
    assert.equal((await response.json()).error, 'body_too_large');
    const info = await (await fetch(`${base}/api/server/google-info`)).json();
    assert.equal(info.cloudStorage.connectivity, 'available');
    assert.equal(info.cloudStorage.roundTripStatus, 'pass');
    assert.equal(info.durableCloudStorage, true);
    assert.equal(info.cloudStorage.lastError, null);
    assert.equal((await (await fetch(`${base}/api/health`)).json()).status, 'ok');
    fake.failRequests = true;
    const outage = await fetch(`${base}/api/data`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(outage.status, 503);
    assert.equal((await outage.json()).error, 'session_store_unavailable');
    const outageInfo = await (await fetch(`${base}/api/server/google-info`)).json();
    assert.equal(outageInfo.cloudStorage.connectivity, 'unavailable');
    assert.equal(outageInfo.cloudStorage.roundTripStatus, 'fail');
    assert.equal(outageInfo.durableCloudStorage, false);
    assert.equal((await (await fetch(`${base}/api/health`)).json()).status, 'degraded');
    fake.failRequests = false;
    assert.equal((await fetch(`${base}/api/data`, { headers: { authorization: `Bearer ${token}` } })).status, 404);
    const recoveredInfo = await (await fetch(`${base}/api/server/google-info`)).json();
    assert.equal(recoveredInfo.cloudStorage.connectivity, 'available');
    assert.equal(recoveredInfo.durableCloudStorage, false);
  } finally {
    await new Promise((resolve) => listener.close(resolve));
  }
});

test('Firestore sessions survive restart, expire, and logout deletes only the selected session', async () => {
  const fake = fakeFirestore();
  const now = Date.UTC(2026, 9, 2);
  const first = makeStore(fake, () => now);
  const tokenHash = crypto.createHash('sha256').update('opaque-token').digest('hex');
  const otherHash = crypto.createHash('sha256').update('other-token').digest('hex');
  const session = (hash, sub) => ({
    tokenHash: hash, createdAt: now, expiresAt: now + 1000, principalId: `google:${sub}`,
    googleUser: { id: sub, sub, email: `${sub}@example.invalid`, displayName: sub, connectedAt: new Date(now).toISOString() },
  });
  await first.saveSession(session(tokenHash, 'one'));
  await first.saveSession(session(otherHash, 'two'));
  assert.equal((await makeStore(fake, () => now).readSession(tokenHash)).googleUser.sub, 'one');
  assert.equal(await makeStore(fake, () => now + 1001).readSession(tokenHash), null);
  await first.deleteSession(tokenHash);
  assert.equal(await makeStore(fake, () => now).readSession(tokenHash), null);
  assert.equal((await makeStore(fake, () => now).readSession(otherHash)).googleUser.sub, 'two');
  assert.equal(JSON.stringify([...fake.documents.values()]).includes('opaque-token'), false);
});

test('Firestore login failures are shared across instances and reset after the window', async () => {
  const fake = fakeFirestore();
  let currentTime = Date.UTC(2026, 9, 2);
  const first = makeStore(fake, () => currentTime);
  const second = makeStore(fake, () => currentTime);
  assert.equal(await first.recordLoginFailure('client-ip', 2, 1000), false);
  assert.equal(await second.recordLoginFailure('client-ip', 2, 1000), true);
  assert.equal(await first.isLoginBlocked('client-ip'), true);
  assert.equal(await first.isLoginBlocked('different-ip'), false);
  currentTime += 1001;
  assert.equal(await second.isLoginBlocked('client-ip'), false);
  assert.equal(await second.recordLoginFailure('client-ip', 2, 1000), false);
  await second.clearLoginFailures('client-ip');
  assert.equal(await first.isLoginBlocked('client-ip'), false);
  assert.equal(JSON.stringify([...fake.documents.keys()]).includes('client-ip'), false);
});

test('Firestore rate limit increments survive concurrent failed attempts', async () => {
  const fake = fakeFirestore();
  const first = makeStore(fake);
  const second = makeStore(fake);
  fake.holdCommits = true;
  const results = await Promise.all([
    first.recordLoginFailure('same-ip', 2, 1000),
    second.recordLoginFailure('same-ip', 2, 1000),
  ]);
  assert.deepEqual(results.sort(), [false, true]);
  assert.equal(await first.isLoginBlocked('same-ip'), true);
});

test('Firestore fails closed for malformed documents, oversized data and unavailable transport', async () => {
  const fake = fakeFirestore();
  const store = makeStore(fake);
  assert.rejects(store.saveData('google:subject', data('x'.repeat(950_000))),
    (error) => error instanceof CloudStoreError && error.status === 413);
  const saved = await store.saveData('google:subject', data('valid'));
  const name = [...fake.documents.keys()][0];
  fake.documents.get(name).fields.payload.stringValue = JSON.stringify({ ...saved, contentHash: '0'.repeat(64) });
  await assert.rejects(store.readData('google:subject'),
    (error) => error instanceof CloudStoreError && error.code === 'cloud_store_corrupt');
  const hash = crypto.createHash('sha256').update('session-token').digest('hex');
  await store.saveSession({
    tokenHash: hash, createdAt: Date.UTC(2026, 9, 2), expiresAt: Date.UTC(2026, 9, 2) + 1000,
    principalId: 'google:real-subject',
    googleUser: { id: 'real-subject', sub: 'real-subject', email: '', displayName: 'Tester', connectedAt: '2026-10-02T00:00:00.000Z' },
  });
  const sessionName = [...fake.documents.keys()].find((key) => key.includes('gymtracker_v1_sessions'));
  const sessionDocument = fake.documents.get(sessionName);
  const forgedSession = JSON.parse(sessionDocument.fields.payload.stringValue);
  forgedSession.googleUser.sub = 'forged-subject';
  sessionDocument.fields.payload.stringValue = JSON.stringify(forgedSession);
  await assert.rejects(store.readSession(hash),
    (error) => error instanceof CloudStoreError && error.code === 'cloud_session_corrupt');
  fake.failRequests = true;
  await assert.rejects(store.readData('google:subject'),
    (error) => error instanceof CloudStoreError && error.code === 'cloud_store_unavailable');
});

test('Cloud Run API persists Google session and data across server restart, enforces revision and logout', async () => {
  const fake = fakeFirestore();
  const now = Date.UTC(2026, 9, 2);
  const launch = async () => {
    const { app } = createApp({
      now: () => now,
      config: { isCloudRun: true, bindHost: '127.0.0.1', port: 0, googleClientIds: ['test-client'] },
      firestoreStore: makeStore(fake, () => now),
      verifyGoogleIdToken: async (idToken) => {
        if (idToken !== 'signed-id-token') throw new Error('invalid');
        return { sub: 'verified-subject', email: 'verified@example.invalid', displayName: 'Verified User' };
      },
    });
    const listener = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => listener.once('listening', resolve));
    return { base: `http://127.0.0.1:${listener.address().port}`, close: () => new Promise((resolve) => listener.close(resolve)) };
  };
  const first = await launch();
  let sessionToken;
  let saved;
  try {
    const initialInfo = await (await fetch(`${first.base}/api/server/google-info`)).json();
    assert.equal(initialInfo.durableCloudStorage, false);
    assert.equal(initialInfo.status, 'online');
    assert.equal((await (await fetch(`${first.base}/api/health`)).json()).status, 'ok');
    const login = await fetch(`${first.base}/api/auth/google/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken: 'signed-id-token', email: 'forged@example.invalid' }),
    });
    assert.equal(login.status, 200);
    const loginBody = await login.json();
    sessionToken = loginBody.token;
    assert.equal(loginBody.user.sub, 'verified-subject');
    assert.equal(loginBody.user.email, 'verified@example.invalid');
    const verifiedInfo = await (await fetch(`${first.base}/api/server/google-info`)).json();
    assert.equal(verifiedInfo.durableCloudStorage, false);
    assert.equal(verifiedInfo.cloudStoreConfigured, true);
    assert.equal(verifiedInfo.cloudStoreVerifiedInProcess, false);
    assert.equal(verifiedInfo.cloudStorage.connectivity, 'available');
    assert.equal(verifiedInfo.cloudStorage.roundTripStatus, 'not_run');
    assert.equal(verifiedInfo.status, 'online');
    const response = await fetch(`${first.base}/api/data`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ schemaVersion: 1, data: data('phone-one') }),
    });
    assert.equal(response.status, 201);
    saved = await response.json();
    assert.equal(saved.revision, 1);
    const afterSaveInfo = await (await fetch(`${first.base}/api/server/google-info`)).json();
    assert.equal(afterSaveInfo.durableCloudStorage, false);
    assert.equal(afterSaveInfo.cloudStorage.connectivity, 'available');
    assert.equal(afterSaveInfo.cloudStorage.roundTripStatus, 'not_run');
  } finally {
    await first.close();
  }
  const second = await launch();
  try {
    const headers = { authorization: `Bearer ${sessionToken}` };
    const read = await fetch(`${second.base}/api/data`, { headers });
    assert.equal(read.status, 200);
    assert.equal((await read.json()).data.settings.owner, 'phone-one');
    const conflict = await fetch(`${second.base}/api/data`, {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ schemaVersion: 1, revision: 0, contentHash: saved.contentHash, data: data('stale') }),
    });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).revision, 1);
    const afterConflictInfo = await (await fetch(`${second.base}/api/server/google-info`)).json();
    assert.equal(afterConflictInfo.status, 'online');
    assert.equal(afterConflictInfo.cloudStorage.connectivity, 'available');
    assert.equal(afterConflictInfo.cloudStorage.roundTripStatus, 'not_run');
    assert.equal(afterConflictInfo.durableCloudStorage, false);
    assert.equal((await (await fetch(`${second.base}/api/health`)).json()).status, 'ok');
    const missingRevision = await fetch(`${second.base}/api/data`, {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ schemaVersion: 1, data: data('missing-revision') }),
    });
    assert.equal(missingRevision.status, 409);
    assert.equal((await missingRevision.json()).reason, 'revision_required');
    const logout = await fetch(`${second.base}/api/auth/google/logout`, { method: 'POST', headers });
    assert.equal(logout.status, 204);
    assert.equal((await fetch(`${second.base}/api/data`, { headers })).status, 401);
  } finally {
    await second.close();
  }
});

test('Cloud Run Google login enforces a distributed attempt limit after process restart', async () => {
  const fake = fakeFirestore();
  const now = Date.UTC(2026, 9, 2);
  const launch = async () => {
    const { app } = createApp({
      now: () => now,
      config: { isCloudRun: true, bindHost: '127.0.0.1', port: 0, googleClientIds: ['test-client'], maxLoginAttempts: 2 },
      firestoreStore: makeStore(fake, () => now),
      verifyGoogleIdToken: async () => { throw new Error('invalid'); },
    });
    const listener = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => listener.once('listening', resolve));
    return { base: `http://127.0.0.1:${listener.address().port}`, close: () => new Promise((resolve) => listener.close(resolve)) };
  };
  const first = await launch();
  try {
    const missing = await fetch(`${first.base}/api/auth/google/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    });
    assert.equal(missing.status, 400);
    const invalid = await fetch(`${first.base}/api/auth/google/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: 'invalid' }),
    });
    assert.equal(invalid.status, 429);
  } finally {
    await first.close();
  }
  const second = await launch();
  try {
    const blocked = await fetch(`${second.base}/api/auth/google/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: 'invalid' }),
    });
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).error, 'too_many_attempts');
  } finally {
    await second.close();
  }
});
