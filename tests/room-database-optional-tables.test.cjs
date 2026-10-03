const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function makeStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}

function loadTsModule(filePath, storage) {
  const dir = path.dirname(filePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const code = ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 });
  const module = { exports: {} };

  function customRequire(request) {
    if (request.startsWith('.')) {
      const resolved = path.resolve(dir, request);
      if (fs.existsSync(`${resolved}.ts`)) return loadTsModule(`${resolved}.ts`, storage);
      if (fs.existsSync(path.join(resolved, 'index.ts'))) return loadTsModule(path.join(resolved, 'index.ts'), storage);
    }
    if (request === '@capacitor/preferences') return { Preferences: { set: async () => {}, remove: async () => {} } };
    return require(request);
  }

  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: customRequire,
    console,
    window: { localStorage: storage },
    localStorage: storage,
  });
  return module.exports;
}

function gymData() {
  return {
    settings: { unit: 'kg', athleteName: 'local-settings', theme: 'dark' },
    weeks: [{
      id: 'week-1', number: 1, name: 'Test week', days: [{
        id: 'day-1', name: 'Test day', completed: false, exercises: [{
          id: 'exercise-1', name: 'Squat', category: 'nogi', sets: 3, reps: 5,
          weight: 100, rpe: 8, notes: '', history: [], loggedSets: [],
        }],
      }],
    }],
    bodyWeights: [{ id: 'weight-1', date: '2026-10-03', weight: 80, notes: '' }],
    profile: { id: 'profile-1', name: 'Primary' },
    profilesList: [{ id: 'profile-1', name: 'Primary' }, { id: 'profile-2', name: 'Second' }],
    syncConfig: { serverUrl: 'https://sync.invalid', port: 443, deviceId: 'device-1', deviceName: 'Test', deviceType: 'android_mobile', pairingCode: 'pair', authToken: 'token', autoSync: false, conflictResolution: 'ask' },
    syncLogs: [{ id: 'sync-1', timestamp: '2026-10-03', direction: 'handshake', recordsAffected: 0, status: 'success', summary: 'ok' }],
    bloodTests: [{ id: 'blood-1', value: 42 }],
    aiChatHistory: [{ id: 'chat-1', role: 'user', content: 'hello' }],
    aiAgentMemories: [{ id: 'memory-1', content: 'remember', createdAt: '2026-10-03' }],
    protocolEntries: [], calendarNotes: [], circumferences: [], bodyPartMeasurements: [], catalogExercises: [],
    workoutSessionsHistory: [], activeSessionDraft: null,
  };
}

test('RoomDatabase separates profile list, sync config and optional JSON tables across restart', async () => {
  const storage = makeStorage();
  const file = path.join(__dirname, '../src/data/db/RoomDatabase.ts');
  const first = loadTsModule(file, storage);
  const data = gymData();
  await first.roomDatabase.atomicWriteFromGymData(data);

  assert.deepEqual(first.roomDatabase.loadGymData().profile, data.profile);
  assert.deepEqual(first.roomDatabase.loadGymData().profilesList, data.profilesList);
  assert.deepEqual(first.roomDatabase.loadGymData().syncConfig, data.syncConfig);
  assert.deepEqual(first.roomDatabase.loadGymData().syncLogs, data.syncLogs);
  assert.deepEqual(first.roomDatabase.loadGymData().bloodTests, data.bloodTests);
  assert.deepEqual(first.roomDatabase.loadGymData().aiChatHistory, data.aiChatHistory);
  assert.deepEqual(first.roomDatabase.loadGymData().aiAgentMemories, data.aiAgentMemories);
  assert.notEqual(storage.getItem('room_tbl_profiles'), storage.getItem('room_tbl_profiles_list'));
  assert.notEqual(storage.getItem('room_tbl_settings'), storage.getItem('room_tbl_sync_config'));

  const second = loadTsModule(file, storage);
  second.roomDatabase.initialize();
  const restarted = second.roomDatabase.loadGymData();
  assert.deepEqual(JSON.parse(JSON.stringify(restarted.profilesList)), data.profilesList);
  assert.deepEqual(JSON.parse(JSON.stringify(restarted.syncConfig)), data.syncConfig);
  assert.deepEqual(JSON.parse(JSON.stringify(restarted.bloodTests)), data.bloodTests);
  assert.deepEqual(JSON.parse(JSON.stringify(restarted.aiChatHistory)), data.aiChatHistory);
  assert.deepEqual(JSON.parse(JSON.stringify(restarted.aiAgentMemories)), data.aiAgentMemories);
});

test('RoomDatabase uses valid legacy extras only when their new table is absent', async () => {
  const storage = makeStorage();
  const legacy = gymData();
  legacy.profilesList = [{ id: 'legacy-profile', name: 'Legacy' }];
  legacy.syncConfig.deviceId = 'legacy-device';
  legacy.bloodTests = [{ id: 'legacy-blood' }];
  storage.setItem('gymtracker_windows_data_v1', JSON.stringify(legacy));

  const file = path.join(__dirname, '../src/data/db/RoomDatabase.ts');
  const module = loadTsModule(file, storage);
  await module.roomDatabase.atomicWriteFromGymData(legacy);
  storage.removeItem('room_tbl_profiles_list');
  storage.removeItem('room_tbl_blood_tests');
  storage.setItem('room_tbl_sync_config', JSON.stringify({ invalid: true }));

  const restarted = loadTsModule(file, storage);
  const loaded = restarted.roomDatabase.loadGymData();
  assert.deepEqual(JSON.parse(JSON.stringify(loaded.profilesList)), legacy.profilesList);
  assert.deepEqual(JSON.parse(JSON.stringify(loaded.bloodTests)), legacy.bloodTests);
  assert.deepEqual(JSON.parse(JSON.stringify(loaded.syncConfig)), { invalid: true });
});

test('RoomDatabase verifies raw persisted JSON and fails closed on tampering', async () => {
  const storage = makeStorage();
  const file = path.join(__dirname, '../src/data/db/RoomDatabase.ts');
  const module = loadTsModule(file, storage);
  await module.roomDatabase.atomicWriteFromGymData(gymData());

  assert.doesNotThrow(() => module.roomDatabase.verifyPersistedTables());
  assert.equal(storage.getItem('room_tbl_active_session_draft'), 'null');

  // The driver cache still contains the original value; verification must inspect raw storage.
  storage.setItem('room_tbl_profiles_list', JSON.stringify([{ id: 'tampered', name: 'Tampered' }]));
  assert.throws(() => module.roomDatabase.verifyPersistedTables(), /profiles_list/);
});
