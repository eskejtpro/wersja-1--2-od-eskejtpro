const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
let CloudSyncController, cloudTrainingSnapshot, restoreCloudTraining, trainingFingerprint;
test.before(async () => {
  ({ CloudSyncController } = await import('../src/utils/cloudSyncController.ts'));
  ({ cloudTrainingSnapshot, restoreCloudTraining, trainingFingerprint } = await import('../src/utils/cloudTrainingData.ts'));
});

const gym = (name = 'original') => ({
  settings: { unit: 'kg', theme: 'dark', autoSave: true, athleteName: 'Tester', windowsPath: 'local', soundFeedback: false,
    googleUser: { id: 'account-a' }, aiAgentApiKey: 'secret-value' },
  weeks: [{ id: 'week-1', name, number: 1, days: [{ id: 'day-1', name: 'Day', exercises: [] }] }],
  bodyWeights: [], syncConfig: { authToken: 'private-session', googleAuthUser: { idToken: 'private-id' } },
  activeSessionDraft: null,
});
function envelope(data, revision = 1) {
  return { schemaVersion: 1, revision, updatedAt: new Date().toISOString(),
    contentHash: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'), data };
}
function fixture(remoteData = null) {
  let local = gym();
  let remote = remoteData ? envelope(remoteData) : null;
  let current = true;
  let canRestore = true;
  const calls = { writes: 0, backups: 0, applies: 0 };
  const deps = {
    read: async () => remote,
    write: async (data, expected) => {
      calls.writes++;
      if (expected.revision !== (remote?.revision || 0) || expected.contentHash !== (remote?.contentHash || null)) {
        throw Object.assign(new Error('conflict'), { status: 409 });
      }
      remote = envelope(data, (remote?.revision || 0) + 1);
      return remote;
    },
    local: () => local,
    backup: async () => { calls.backups++; },
    apply: async (data) => { calls.applies++; local = data; },
    current: () => current,
    restoringAllowed: () => canRestore,
    change: () => {},
  };
  const controller = new CloudSyncController(deps);
  return { controller, deps, calls, get local() { return local; }, set local(v) { local = v; },
    get remote() { return remote; }, set remote(v) { remote = v; },
    set current(v) { current = v; }, set canRestore(v) { canRestore = v; } };
}

test('portable backup strips credentials and device settings without changing local data', () => {
  const local = gym();
  local.profile = { id: 'user', name: 'Tester', googleAccount: { id: 'account-a' } };
  local.bloodTests = [{ privateHealth: 'local-only' }];
  local.aiChatHistory = [{ content: 'local-only' }];
  local.protocolEntries = [{ substance: 'local-only' }];
  local.weeks[0].privateToken = 'hidden';
  const payload = cloudTrainingSnapshot(local);
  assert.deepEqual(payload.settings, {});
  assert.equal(payload.syncConfig, undefined);
  assert.equal(payload.activeSessionDraft, undefined);
  assert.equal(payload.profile, undefined);
  assert.equal(payload.bloodTests, undefined);
  assert.equal(payload.aiChatHistory, undefined);
  assert.equal(payload.protocolEntries, undefined);
  assert.equal(payload.weeks[0].privateToken, undefined);
  assert.equal(local.settings.aiAgentApiKey, 'secret-value');
  assert.equal(local.syncConfig.authToken, 'private-session');
});

test('restore preserves device settings, current identity and credentials', () => {
  const local = gym();
  local.profile = { id: 'local-profile', googleAccount: { id: 'account-a' } };
  local.bloodTests = [{ privateHealth: 'keep' }];
  const restored = restoreCloudTraining(local, gym('remote'));
  assert.equal(restored.weeks[0].name, 'remote');
  assert.equal(restored.settings, local.settings);
  assert.equal(restored.syncConfig, local.syncConfig);
  assert.equal(restored.profile, local.profile);
  assert.equal(restored.bloodTests, local.bloodTests);
});

test('inspection and preview do not write anything until confirmation', async () => {
  const f = fixture();
  await f.controller.inspect('upload');
  assert.equal(f.calls.writes, 0);
  assert.equal(f.controller.state.confirmation, 'upload');
  await f.controller.confirm();
  assert.equal(f.calls.writes, 1);
  assert.equal(f.controller.state.status, 'verified');
  assert.deepEqual(f.remote.data.settings, {});
});

test('changed local training invalidates the preview before upload', async () => {
  const f = fixture();
  await f.controller.inspect('upload');
  f.local = gym('edited during preview');
  await f.controller.confirm();
  assert.equal(f.calls.writes, 0);
  assert.equal(f.controller.state.status, 'error');
});

test('stale server revision stops upload and preserves both sets of data', async () => {
  const f = fixture(gym('old remote'));
  await f.controller.inspect('upload');
  f.remote = envelope(gym('another device'), 2);
  await f.controller.confirm();
  assert.equal(f.controller.state.status, 'conflict');
  assert.equal(f.remote.data.weeks[0].name, 'another device');
  assert.equal(f.local.weeks[0].name, 'original');
});

test('failed backup blocks restore before any local mutation', async () => {
  const f = fixture(gym('remote'));
  f.deps.backup = async () => { throw new Error('backup failed'); };
  await f.controller.inspect('restore');
  await f.controller.confirm();
  assert.equal(f.calls.applies, 0);
  assert.equal(f.local.weeks[0].name, 'original');
});

test('restore backs up first and refuses active workouts', async () => {
  const f = fixture(gym('remote'));
  f.canRestore = false;
  await f.controller.inspect('restore');
  await f.controller.confirm();
  assert.equal(f.calls.backups, 0);
  assert.equal(f.calls.applies, 0);
  f.canRestore = true;
  await f.controller.inspect('restore');
  await f.controller.confirm();
  assert.equal(f.calls.backups, 1);
  assert.equal(f.calls.applies, 1);
  assert.equal(f.local.weeks[0].name, 'remote');
  assert.equal(f.local.settings.googleUser.id, 'account-a');
});

test('logout while waiting for cloud read never applies a previous account snapshot', async () => {
  const f = fixture(gym('remote'));
  await f.controller.inspect('restore');
  f.deps.read = async () => { f.current = false; return f.remote; };
  await f.controller.confirm();
  assert.equal(f.calls.backups, 0);
  assert.equal(f.calls.applies, 0);
});

test('automatic sync is disabled until an explicit initial operation succeeds', async () => {
  const f = fixture(gym('remote'));
  await f.controller.reconcile();
  assert.equal(f.calls.writes, 0);
  assert.equal(f.calls.applies, 0);
});

test('automatic sync uploads local changes and stops when both sides change', async () => {
  const f = fixture();
  await f.controller.inspect('upload'); await f.controller.confirm();
  f.local = gym('next local');
  await f.controller.reconcile();
  assert.equal(f.remote.data.weeks[0].name, 'next local');
  f.local = gym('local collision'); f.remote = envelope(gym('remote collision'), 3);
  await f.controller.reconcile();
  assert.equal(f.controller.state.status, 'conflict');
  assert.equal(f.local.weeks[0].name, 'local collision');
  assert.equal(f.remote.data.weeks[0].name, 'remote collision');
});

test('automatic incoming update creates local backup and defers an active workout', async () => {
  const f = fixture();
  await f.controller.inspect('upload'); await f.controller.confirm();
  f.remote = envelope(cloudTrainingSnapshot(gym('remote edit')), 2);
  f.canRestore = false;
  await f.controller.reconcile();
  assert.equal(f.calls.applies, 0);
  f.canRestore = true;
  await f.controller.reconcile();
  assert.equal(f.calls.backups, 1);
  assert.equal(f.local.weeks[0].name, 'remote edit');
});

test('write response alone cannot be reported as verified storage', async () => {
  const f = fixture();
  await f.controller.inspect('upload');
  f.deps.write = async (data) => envelope(data);
  await f.controller.confirm();
  assert.equal(f.controller.state.status, 'error');
  assert.equal(f.controller.established, false);
});

test('reconnect retries safely after a network error', async () => {
  const f = fixture();
  await f.controller.inspect('upload'); await f.controller.confirm();
  const originalRead = f.deps.read;
  f.local = gym('offline edit');
  f.deps.read = async () => { throw new TypeError('Failed to fetch'); };
  await f.controller.reconcile();
  assert.equal(f.controller.state.status, 'error');
  f.deps.read = originalRead;
  await f.controller.reconcile();
  assert.equal(f.remote.data.weeks[0].name, 'offline edit');
  assert.equal(f.controller.state.status, 'verified');
});

test('automatic sync does not upload partial workout data', async () => {
  const f = fixture();
  await f.controller.inspect('upload'); await f.controller.confirm();
  f.local = gym('active edit'); f.canRestore = false;
  await f.controller.reconcile();
  assert.equal(f.calls.writes, 1);
  assert.equal(f.controller.state.status, 'pending');
  f.canRestore = true;
  await f.controller.reconcile();
  assert.equal(f.calls.writes, 2);
});

test('workout started during backup blocks restore before apply', async () => {
  const f = fixture(gym('remote'));
  f.deps.backup = async () => { f.canRestore = false; };
  await f.controller.inspect('restore'); await f.controller.confirm();
  assert.equal(f.calls.applies, 0);
  assert.equal(f.local.weeks[0].name, 'original');
});

test('apply receives a live session guard to abort after each asynchronous write', async () => {
  const f = fixture(gym('remote'));
  f.deps.apply = async (_data, _fingerprint, ensureCurrent) => {
    f.current = false;
    ensureCurrent();
    f.calls.applies++;
  };
  await f.controller.inspect('restore'); await f.controller.confirm();
  assert.equal(f.calls.applies, 0);
});

test('corrupt recovery journal is retained and identified, never silently discarded', async () => {
  const map = new Map([['gymtracker_cloud_restore_recovery_v1', '{broken']]);
  global.localStorage = { getItem: key => map.get(key) || null };
  const recovery = await import('../src/utils/cloudRestoreRecovery.ts');
  assert.equal(recovery.hasCloudRestoreRecovery(), true);
  assert.throws(() => recovery.readCloudRestoreRecovery());
  assert.equal(map.get(recovery.CLOUD_RESTORE_RECOVERY_KEY), '{broken');
  delete global.localStorage;
});

test('process-death restore journal contains the old complete snapshot until finish', async () => {
  const map = new Map();
  global.localStorage = { getItem: (key) => map.get(key) || null, setItem: (key, value) => map.set(key, value), removeItem: (key) => map.delete(key) };
  const recovery = await import('../src/utils/cloudRestoreRecovery.ts');
  const original = gym();
  recovery.beginCloudRestoreRecovery(original);
  assert.deepEqual(recovery.readCloudRestoreRecovery(), original);
  recovery.finishCloudRestoreRecovery();
  assert.equal(recovery.readCloudRestoreRecovery(), null);
  global.localStorage.setItem = () => { throw new Error('quota exceeded'); };
  assert.throws(() => recovery.beginCloudRestoreRecovery(original), /quota exceeded/);
  delete global.localStorage;
});
