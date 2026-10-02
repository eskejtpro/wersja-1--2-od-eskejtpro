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
    window: { localStorage: mockLocalStorage },
    localStorage: mockLocalStorage,
    ...customContext
  };
  vm.runInNewContext(transpiled, sandbox);
  return m.exports;
}

test('RoomDatabase operates on structured table partitions and DAOs', () => {
  mockLocalStorage.clear();

  const dbModule = loadTsModule(path.join(__dirname, '../src/data/db/RoomDatabase.ts'));
  const db = dbModule.roomDatabase;

  // 1. Plan DAO
  db.planDao.insertOrUpdate({
    id: 'plan-fbw-1',
    name: 'FBW Pasik Pro',
    isDefault: true,
    isActive: true,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z'
  });

  const activePlan = db.planDao.getActive();
  assert.equal(activePlan.id, 'plan-fbw-1');
  assert.equal(activePlan.name, 'FBW Pasik Pro');

  // Verify it wrote specifically to room_tbl_workout_plans
  assert.ok(mockLocalStorage.getItem('room_tbl_workout_plans'));

  // 2. Exercise DAO & Structured Update
  db.exerciseDao.insertOrUpdate({
    id: 'ex-squat',
    dayId: 'day-1',
    orderIndex: 0,
    name: 'Przysiad ze sztangą',
    category: 'nogi',
    sets: 4,
    reps: 8,
    weight: 140.0
  });

  let exercise = db.exerciseDao.getById('ex-squat');
  assert.equal(exercise.weight, 140.0);

  // Micro-progression without full-object serialization
  db.exerciseDao.updateWeight('ex-squat', 142.5);
  exercise = db.exerciseDao.getById('ex-squat');
  assert.equal(exercise.weight, 142.5);

  // 3. LoggedSet DAO
  db.loggedSetDao.insertOrUpdate({
    id: 'set-1',
    exerciseId: 'ex-squat',
    setNumber: 1,
    weight: 142.5,
    reps: 8,
    completed: true,
    executedAt: '2026-10-01T10:15:00Z'
  });

  const sets = db.loggedSetDao.getForExercise('ex-squat');
  assert.equal(sets.length, 1);
  assert.equal(sets[0].completed, true);
  assert.equal(sets[0].weight, 142.5);

  // Verify it wrote specifically to room_tbl_logged_sets
  assert.ok(mockLocalStorage.getItem('room_tbl_logged_sets'));

  // 4. BodyWeight DAO
  db.bodyWeightDao.insert({
    id: 'bw-101',
    date: '2026-10-01',
    weight: 87.9,
    notes: 'Czysta waga po przebudzeniu'
  });

  const weights = db.bodyWeightDao.getAll();
  assert.equal(weights.length, 1);
  assert.equal(weights[0].weight, 87.9);

  // 5. ActiveSessionDraft DAO (Crash-Proof)
  db.activeDraftDao.saveDraft({
    sessionId: 'sess-active-99',
    planId: 'plan-fbw-1',
    weekId: 'week-1',
    dayId: 'day-1',
    dayName: 'Nogi + Brzuch',
    startedAt: '2026-10-01T10:00:00Z',
    lastSavedAt: '2026-10-01T10:20:00Z',
    elapsedSeconds: 1200,
    isPaused: false,
    activeExercises: []
  });

  const draft = db.activeDraftDao.getDraft();
  assert.equal(draft.sessionId, 'sess-active-99');
  assert.equal(draft.dayName, 'Nogi + Brzuch');

  db.activeDraftDao.clearDraft();
  assert.equal(db.activeDraftDao.getDraft(), null);
});
