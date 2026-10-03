import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const { pullServerData, pushServerData } = await import('../src/utils/serverApi.ts');

const config = (serverUrl, authToken) => ({
  serverUrl, authToken, port: 0, deviceId: 'test', deviceName: 'test', deviceType: 'windows_desktop',
  pairingCode: '', autoSync: false, conflictResolution: 'ask',
});

const gymData = () => ({ settings: {}, weeks: [{ id: 'w1', name: 'Week 1', number: 1, days: [{ id: 'd1', name: 'Day 1', completed: false, exercises: [] }] }], bodyWeights: [] });
const gymHash = createHash('sha256').update(JSON.stringify(gymData())).digest('hex');
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) });

test('pull isolates baselines by server URL and session token', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return response({ schemaVersion: 1, revision: 4, updatedAt: '2026-10-03T00:00:00Z', contentHash: gymHash, data: gymData() });
  };
  const a = config('https://sync.example/', 'token-a');
  const b = config('https://sync.example', 'token-b');
  const pulledA = await pullServerData(a);
  const pulledB = await pullServerData(b);
  assert.equal(pulledA.data.settings.constructor, Object);
  assert.equal(pulledB.data.settings.constructor, Object);
  const posted = [];
  globalThis.fetch = async (_url, init) => { posted.push(JSON.parse(init.body)); return response({ schemaVersion: 1, revision: 5, updatedAt: '2026-10-03T00:01:00Z', contentHash: gymHash, data: gymData() }); };
  await pushServerData(a, gymData(), { revision: 4, contentHash: gymHash });
  await pushServerData(b, gymData(), { revision: 4, contentHash: gymHash });
  assert.equal(calls[0].init.headers.Authorization, 'Bearer token-a');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer token-b');
  assert.deepEqual(posted.map((body) => [body.revision, body.contentHash]), [[4, gymHash], [4, gymHash]]);
});

test('pull rejects malformed envelope and data', async () => {
  globalThis.fetch = async () => response({ schemaVersion: 1, revision: 2, updatedAt: 'now', contentHash: 'x', data: { settings: {} } });
  await assert.rejects(() => pullServerData(config('https://bad.example', 'token')), /server_invalid_data_envelope/);
});

test('push exposes server 409 conflict details', async () => {
  globalThis.fetch = async (_url, init) => init?.method === 'POST'
    ? response({ error: 'conflict', revision: 9, contentHash: 'newer' }, 409)
    : response({ schemaVersion: 1, revision: 4, updatedAt: 'now', contentHash: gymHash, data: gymData() });
  const syncConfig = config('https://conflict.example', 'token');
  await pullServerData(syncConfig);
  await assert.rejects(
    () => pushServerData(syncConfig, gymData(), { revision: 4, contentHash: gymHash }),
    (error) => error.status === 409 && error.body.error === 'conflict',
  );
});

test('push refuses to write without an explicit baseline and does not fetch', async () => {
  let fetchCount = 0;
  globalThis.fetch = async () => { fetchCount += 1; return response({}); };
  await assert.rejects(() => pushServerData(config('https://no-baseline.example', 'token'), gymData()), /sync_baseline_required/);
  assert.equal(fetchCount, 0);
});

test('404 data_unavailable establishes the empty baseline', async () => {
  globalThis.fetch = async () => response({ error: 'data_unavailable' }, 404);
  assert.equal(await pullServerData(config('https://empty.example', 'token')), null);
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.revision, 0);
    assert.equal(body.contentHash, null);
    return response({ schemaVersion: 1, revision: 1, updatedAt: 'now', contentHash: gymHash, data: gymData() }, 201);
  };
  await pushServerData(config('https://empty.example', 'token'), gymData(), { revision: 0, contentHash: null });
});

test('pull rejects malformed nested exercise, sets, and finite numeric fields', async () => {
  const invalid = gymData();
  invalid.weeks[0].days[0].exercises = [{ id: 'e1', name: 'Squat', sets: NaN, reps: 5, weight: 80, rpe: 8, notes: '', history: [], loggedSets: [{ setNumber: 1, weight: 80, reps: 5, completed: 'yes' }] }];
  globalThis.fetch = async () => response({ schemaVersion: 1, revision: 2, updatedAt: 'now', contentHash: gymHash, data: invalid });
  await assert.rejects(() => pullServerData(config('https://nested-invalid.example', 'token')), /server_invalid_data_envelope/);
});

test('pull accepts historical optional measurements when valid and rejects wrong shapes', async () => {
  const valid = gymData();
  valid.bodyPartMeasurements = [{ id: 'm1', date: '2026-10-03', part: 'biceps', value: 38.5 }];
  valid.circumferences = [{ id: 'c1', date: '2026-10-03', bodyPart: 'klatka', side: null, variant: 'standard', millimeters: 1000, notes: '' }];
  const hash = createHash('sha256').update(JSON.stringify(valid)).digest('hex');
  globalThis.fetch = async () => response({ schemaVersion: 1, revision: 2, updatedAt: 'now', contentHash: hash, data: valid });
  assert.ok((await pullServerData(config('https://measurements.example', 'token')))?.data);
  const invalid = { ...valid, bodyPartMeasurements: [{ ...valid.bodyPartMeasurements[0], value: Infinity }] };
  globalThis.fetch = async () => response({ schemaVersion: 1, revision: 3, updatedAt: 'now', contentHash: hash, data: invalid });
  await assert.rejects(() => pullServerData(config('https://measurements-invalid.example', 'token')), /server_invalid_data_envelope/);
});
