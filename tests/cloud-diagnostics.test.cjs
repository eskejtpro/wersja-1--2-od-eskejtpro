const test = require('node:test');
const assert = require('node:assert/strict');

process.env.GYMTRACKER_NO_AUTOSTART = '1';

function fakeTransport(options = {}) {
  const documents = new Map();
  let version = 0;
  const request = async ({ url, method, data }) => {
    const prefix = 'https://firestore.googleapis.com/v1/';
    if (method === 'GET') {
      const document = documents.get(url.slice(prefix.length));
      if (!document) {
        const error = new Error('NOT_FOUND');
        error.response = { status: 404 };
        throw error;
      }
      const result = structuredClone(document);
      if (options.tamperPayload) result.fields.payload.stringValue = result.fields.payload.stringValue.replace('"marker":"', '"marker":"tampered-');
      return { data: result };
    }
    assert.equal(method, 'POST');
    for (const write of data.writes) {
      if (write.delete) {
        if (!options.ackDeleteButKeepDocument) documents.delete(write.delete);
        continue;
      }
      const name = write.update.name;
      const current = documents.get(name);
      if (write.currentDocument?.exists === false && current) {
        const error = new Error('FAILED_PRECONDITION');
        error.response = { status: 409, data: { error: { status: 'FAILED_PRECONDITION' } } };
        throw error;
      }
      if (write.currentDocument?.updateTime && write.currentDocument.updateTime !== current?.updateTime) {
        const error = new Error('FAILED_PRECONDITION');
        error.response = { status: options.invalidStaleTimestamp ? 400 : 409, data: { error: { status: options.invalidStaleTimestamp ? 'INVALID_ARGUMENT' : 'FAILED_PRECONDITION' } } };
        throw error;
      }
      version += 1;
      documents.set(name, {
        updateTime: `2026-10-03T00:00:00.${String(version).padStart(3, '0')}Z`,
        fields: write.update.fields,
      });
    }
    return { data: { commitTime: new Date().toISOString() } };
  };
  return { documents, request };
}

test('Firestore diagnostics is auth protected and proves write/read/update/hash/stale conflict/cleanup through fake transport', async () => {
  const { FirestoreStore } = await import('../server/data/firestoreStore.ts');
  const { createApp } = await import('../server.ts');
  const fake = fakeTransport();
  const store = new FirestoreStore({ projectId: 'diagnostics-test', requester: fake.request, validateData: () => true });
  const { app } = createApp({
    config: { isCloudRun: true, bindHost: '127.0.0.1', googleClientIds: ['test-client'] },
    firestoreStore: store,
    verifyGoogleIdToken: async (token) => {
      if (token !== 'signed-token') throw new Error('invalid');
      return { sub: 'diagnostic-user', email: 'diagnostic@example.invalid', displayName: 'Diagnostics' };
    },
  });
  const listener = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => listener.once('listening', resolve));
  const base = `http://127.0.0.1:${listener.address().port}`;
  try {
    const unauthorized = await fetch(`${base}/api/diagnostics/firestore`, { method: 'POST' });
    assert.equal(unauthorized.status, 401);
    const login = await fetch(`${base}/api/auth/google/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken: 'signed-token', namespace: 'client-controlled' }),
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const response = await fetch(`${base}/api/diagnostics/firestore`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ namespace: 'must-be-ignored', collection: 'gymtracker_v1_data' }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
    const result = await response.json();
    assert.equal(result.status, 'pass');
    const postDiagnosticInfo = await (await fetch(`${base}/api/server/google-info`)).json();
    assert.equal(postDiagnosticInfo.durableCloudStorage, true);
    assert.equal(postDiagnosticInfo.cloudStorage.connectivity, 'available');
    assert.equal(postDiagnosticInfo.cloudStorage.roundTripStatus, 'pass');
    assert.ok(postDiagnosticInfo.cloudStorage.lastRoundTripAt);
    assert.deepEqual(result.steps.map((step) => step.name), ['write', 'read', 'update', 'revision/hash', 'STALE_WRITE expect conflict', 'post-stale verification', 'cleanup']);
    assert.ok(result.steps.every((step) => step.status === 'pass'));
    assert.equal([...fake.documents.keys()].some((name) => name.includes('/gymtracker_v1_data/')), false);
    assert.equal([...fake.documents.keys()].some((name) => name.includes('/gymtracker_v1_diagnostics/')), false);
  } finally {
    await new Promise((resolve) => listener.close(resolve));
  }
});

test('Firestore diagnostics throttles per authenticated user for 60 seconds', async () => {
  const { FirestoreStore } = await import('../server/data/firestoreStore.ts');
  const { createApp } = await import('../server.ts');
  const fake = fakeTransport();
  const store = new FirestoreStore({ projectId: 'diagnostics-test', requester: fake.request, validateData: () => true });
  const { app } = createApp({
    config: { isCloudRun: true, bindHost: '127.0.0.1', googleClientIds: ['test-client'] }, firestoreStore: store,
    verifyGoogleIdToken: async () => ({ sub: 'throttle-user', email: 'throttle@example.invalid', displayName: 'Throttle' }),
  });
  const listener = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => listener.once('listening', resolve));
  const base = `http://127.0.0.1:${listener.address().port}`;
  try {
    const login = await fetch(`${base}/api/auth/google/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: 'signed-token' }) });
    const { token } = await login.json();
    const headers = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(`${base}/api/diagnostics/firestore`, { method: 'POST', headers })).status, 200);
    assert.equal((await fetch(`${base}/api/diagnostics/firestore`, { method: 'POST', headers })).status, 429);
  } finally {
    await new Promise((resolve) => listener.close(resolve));
  }
});

test('Firestore diagnostics returns fail with test document id when fake transport is unavailable', async () => {
  const { FirestoreStore } = await import('../server/data/firestoreStore.ts');
  const store = new FirestoreStore({
    projectId: 'diagnostics-test',
    requester: async () => { throw new Error('transport unavailable'); },
    validateData: () => true,
  });
  const result = await store.selfTest('request-test');
  assert.equal(result.status, 'fail');
  assert.match(result.documentId, /^[0-9a-f-]{36}$/);
  assert.equal(result.steps[0].status, 'fail');
  assert.equal(result.steps.at(-1).name, 'cleanup');
  assert.equal(result.steps.some((step) => JSON.stringify(step).includes('principal')), false);
  assert.equal(result.steps.some((step) => JSON.stringify(step).includes('token')), false);
});

test('Firestore diagnostics does not treat an invalid stale timestamp as a conflict', async () => {
  const { FirestoreStore } = await import('../server/data/firestoreStore.ts');
  const result = await new FirestoreStore({ projectId: 'diagnostics-test', requester: fakeTransport({ invalidStaleTimestamp: true }).request, validateData: () => true }).selfTest();
  assert.equal(result.status, 'fail');
  assert.equal(result.steps.find((step) => step.name === 'STALE_WRITE expect conflict').status, 'fail');
});

test('Firestore diagnostics fails when delete is acknowledged but the document remains', async () => {
  const { FirestoreStore } = await import('../server/data/firestoreStore.ts');
  const result = await new FirestoreStore({ projectId: 'diagnostics-test', requester: fakeTransport({ ackDeleteButKeepDocument: true }).request, validateData: () => true }).selfTest();
  assert.equal(result.status, 'fail');
  assert.equal(result.steps.at(-1).name, 'cleanup');
  assert.equal(result.steps.at(-1).status, 'fail');
});

test('Firestore diagnostics detects a tampered payload by recomputing its hash', async () => {
  const { FirestoreStore } = await import('../server/data/firestoreStore.ts');
  const result = await new FirestoreStore({ projectId: 'diagnostics-test', requester: fakeTransport({ tamperPayload: true }).request, validateData: () => true }).selfTest();
  assert.equal(result.status, 'fail');
  assert.equal(result.steps.find((step) => step.name === 'read').status, 'fail');
});

test('Cloud Run AI endpoints fail closed without a provider instead of inventing cloud output', async () => {
  const { FirestoreStore } = await import('../server/data/firestoreStore.ts');
  const { createApp } = await import('../server.ts');
  const priorGemini = process.env.GEMINI_API_KEY;
  const priorApi = process.env.API_KEY;
  process.env.GEMINI_API_KEY = ''; process.env.API_KEY = '';
  const store = new FirestoreStore({ projectId: 'diagnostics-test', requester: fakeTransport().request, validateData: () => true });
  const { app } = createApp({ config: { isCloudRun: true, bindHost: '127.0.0.1', googleClientIds: ['test-client'] },
    firestoreStore: store, verifyGoogleIdToken: async () => ({ sub: 'ai-test-user', email: 'ai@example.invalid', displayName: 'Test' }) });
  const listener = app.listen(0, '127.0.0.1');
  await new Promise(resolve => listener.once('listening', resolve));
  const base = `http://127.0.0.1:${listener.address().port}`;
  try {
    const login = await fetch(`${base}/api/auth/google/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: 'signed-test-token' }) });
    const { token } = await login.json();
    for (const endpoint of ['coach/chat', 'coach/generate-plan', 'coach/nutrition-plan', 'coach/swap-exercise', 'coach/audit-health', 'coach/tts', 'agent/parse-command']) {
      const response = await fetch(`${base}/api/ai/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: 'Test', command: 'Test', text: 'Test', exerciseName: 'Test' }) });
      assert.equal(response.status, 503, endpoint);
      const body = await response.json();
      assert.equal(typeof body.error, 'string');
      assert.equal(body.reply, undefined);
      assert.equal(body.planText, undefined);
      assert.equal(body.substitutes, undefined);
    }
  } finally {
    await new Promise(resolve => listener.close(resolve));
    if (priorGemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = priorGemini;
    if (priorApi === undefined) delete process.env.API_KEY; else process.env.API_KEY = priorApi;
  }
});
