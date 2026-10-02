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

test('Local TypeScript adapter transitions from legacy JSON to logical JSON partitions', async () => {
  mockLocalStorage.clear();

  const dbModule = loadTsModule(path.join(__dirname, '../src/data/db/RoomDatabase.ts'));
  const db = dbModule.roomDatabase;

  // 1. Początkowy stan: brak danych strukturalnych
  assert.equal(db.hasStructuredData(), false);

  // 2. Legacy JSON data w pamięci
  const legacyData = {
    settings: { unit: 'kg', theme: 'dark', athleteName: 'Pasik 14T' },
    weeks: [
      {
        id: 'week-fbw',
        number: 1,
        name: 'Tydzień FBW 1',
        days: [
          {
            id: 'day-fbw-a',
            name: 'Trening A (Góra)',
            completed: false,
            exercises: [
              {
                id: 'ex-bench-press',
                name: 'Wyciskanie leżąc',
                category: 'klatka',
                sets: 3,
                reps: 8,
                weight: 100.0,
                rpe: 8.5,
                loggedSets: [
                  { setNumber: 1, weight: 100, reps: 8, completed: true }
                ]
              }
            ]
          }
        ]
      }
    ],
    bodyWeights: [
      { id: 'bw-99', date: '2026-10-01', weight: 89.2, notes: 'Czysta masa' }
    ],
    circumferences: [
      { id: 'c-99', date: '2026-10-01', bodyPart: 'klatka', side: null, variant: 'relaxed', millimeters: 1180, notes: '' }
    ]
  };

  // 3. Migracja legacy JSON do logicznych partycji JSON w mockowanym localStorage
  await db.migrateFromJson(legacyData);

  // 4. Potwierdzenie zapisu snapshotu bezpieczeństwa
  assert.ok(mockLocalStorage.getItem('planpasika_pre_room_sql_backup'));
  assert.ok(mockLocalStorage.getItem('planpasika_room_migrated_v3'));

  // 5. Potwierdzenie obecności tabel strukturalnych
  assert.equal(db.hasStructuredData(), true);
  assert.equal(db.planDao.getAll().length, 1);
  assert.equal(db.weekDao.getAll().length, 1);
  assert.equal(db.dayDao.getAll().length, 1);
  assert.equal(db.exerciseDao.getAll().length, 1);
  assert.equal(db.loggedSetDao.getAll().length, 1);

  // 6. Odtworzenie obiektu domenowego GymData z logicznych partycji JSON
  const reconstructed = db.loadGymData();
  assert.ok(reconstructed);
  assert.equal(reconstructed.weeks.length, 1);
  assert.equal(reconstructed.weeks[0].name, 'Tydzień FBW 1');
  assert.equal(reconstructed.weeks[0].days[0].exercises[0].name, 'Wyciskanie leżąc');
  assert.equal(reconstructed.weeks[0].days[0].exercises[0].loggedSets[0].weight, 100);
  assert.equal(reconstructed.bodyWeights[0].weight, 89.2);
  assert.equal(reconstructed.circumferences[0].millimeters, 1180);

  // 7. Test nieblokującego, atomowego zapisu nowej jednostki
  reconstructed.bodyWeights.push({ id: 'bw-100', date: '2026-10-02', weight: 89.4, notes: '' });
  await db.atomicWriteFromGymData(reconstructed);

  const updated = db.loadGymData();
  assert.equal(updated.bodyWeights.length, 2);
  assert.equal(updated.bodyWeights[1].weight, 89.4);
});
