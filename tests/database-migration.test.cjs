const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

const mockLocalStorage = createMockLocalStorage();

function loadTsModule(filePath, customContext = {}) {
  const dir = path.dirname(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpile(content, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  });
  const m = { exports: {} };

  function customRequire(reqPath) {
    if (reqPath.startsWith('.')) {
      let resolved = path.resolve(dir, reqPath);
      if (fs.existsSync(resolved + '.ts')) {
        return loadTsModule(resolved + '.ts', customContext);
      }
      if (fs.existsSync(path.join(resolved, 'index.ts'))) {
        return loadTsModule(path.join(resolved, 'index.ts'), customContext);
      }
      if (fs.existsSync(resolved + '.js')) {
        return require(resolved + '.js');
      }
      if (fs.existsSync(path.join(resolved, 'index.js'))) {
        return require(path.join(resolved, 'index.js'));
      }
      if (fs.existsSync(resolved)) {
        return require(resolved);
      }
    }
    return require(reqPath);
  }

  const sandbox = {
    module: m,
    exports: m.exports,
    console,
    require: customRequire,
    localStorage: mockLocalStorage,
    ...customContext
  };
  vm.runInNewContext(transpiled, sandbox);
  return m.exports;
}

test('AppDatabase migrates legacy data without loss and persists normalized tables', () => {
  mockLocalStorage.clear();

  const legacyData = {
    settings: {
      unit: 'kg',
      athleteName: 'Pasik Xiaomi 14T',
      theme: 'dark'
    },
    weeks: [
      {
        id: 'week-1',
        number: 1,
        name: 'Tydzień 1 - Hipertrofia',
        days: [
          {
            id: 'w1-d1',
            name: 'Klatka + Triceps',
            completed: false,
            exercises: [
              {
                id: 'ex-bench',
                name: 'Wyciskanie sztangi',
                category: 'klatka',
                sets: 4,
                reps: 10,
                weight: 92.5,
                rpe: 8,
                notes: 'Pauza 1 sek.',
                history: [],
                loggedSets: [
                  { setNumber: 1, weight: 92.5, reps: 10, completed: true }
                ]
              }
            ]
          }
        ]
      }
    ],
    bodyWeights: [
      { id: 'bw-1', date: '2026-10-01', weight: 88.4, notes: 'Rano na czczo' }
    ],
    circumferences: [
      { id: 'c-1', date: '2026-10-01', bodyPart: 'ramię', side: 'right', variant: 'flexed', millimeters: 425, notes: 'Pompa' }
    ]
  };

  mockLocalStorage.setItem('gymtracker_windows_data_v1', JSON.stringify(legacyData));

  // Load database module
  const dbModule = loadTsModule(path.join(__dirname, '../src/data/db/AppDatabase.ts'));
  const db = dbModule.appDatabase;
  db.initialize();

  // 1. Sprawdzenie backupu przed migracją
  assert.ok(mockLocalStorage.getItem('planpasika_v3_pre_migration_backup'));

  // 2. Sprawdzenie znormalizowanych encji w bazie
  const raw = db.getRawState();
  assert.equal(raw.version, 3);
  assert.equal(Object.keys(raw.weeks).length, 1);
  assert.equal(raw.weeks['week-1'].name, 'Tydzień 1 - Hipertrofia');
  assert.equal(Object.keys(raw.days).length, 1);
  assert.equal(raw.days['w1-d1'].name, 'Klatka + Triceps');
  assert.equal(Object.keys(raw.exercises).length, 1);
  assert.equal(raw.exercises['ex-bench'].weight, 92.5);

  // 3. Sprawdzenie zapisu aktywnego szkicu (crash recovery)
  const mockDraft = {
    sessionId: 'sess-123',
    planId: 'plan-main-1',
    weekId: 'week-1',
    dayId: 'w1-d1',
    dayName: 'Klatka + Triceps',
    startedAt: '2026-10-01T10:00:00Z',
    lastSavedAt: '2026-10-01T10:15:00Z',
    elapsedSeconds: 900,
    isPaused: false,
    activeExercises: [
      {
        exerciseId: 'ex-bench',
        name: 'Wyciskanie sztangi',
        category: 'klatka',
        orderIndex: 0,
        targetSets: 4,
        targetReps: 10,
        targetWeight: 92.5,
        sets: [
          { setNumber: 1, weight: 92.5, reps: 10, completed: true, completedAt: '2026-10-01T10:05:00Z' }
        ]
      }
    ]
  };

  db.saveActiveSessionDraft(mockDraft);
  assert.deepEqual(db.getActiveSessionDraft().sessionId, 'sess-123');
  assert.equal(db.getActiveSessionDraft().activeExercises[0].sets.length, 1);

  // 4. Czyszczenie szkicu po zakończeniu treningu
  db.clearActiveSessionDraft();
  assert.equal(db.getActiveSessionDraft(), null);

  // 5. Sprawdzenie odtwarzania zgodnego z widokiem GymData
  const reconstructed = db.toGymData();
  assert.equal(reconstructed.weeks.length, 1);
  assert.equal(reconstructed.weeks[0].days[0].exercises[0].name, 'Wyciskanie sztangi');
  assert.equal(reconstructed.bodyWeights[0].weight, 88.4);
  assert.equal(reconstructed.circumferences[0].millimeters, 425);
});
