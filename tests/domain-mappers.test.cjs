const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function loadTsModule(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpile(content, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  });
  const m = { exports: {} };
  vm.runInNewContext(transpiled, { module: m, exports: m.exports, console, require });
  return m.exports;
}

const { normalizeGymDataToRelational, denormalizeRelationalToWeeks } = loadTsModule(
  path.join(__dirname, '../src/domain/mappers.ts')
);

test('structured round trip preserves history and explicit zero values without sharing mutable history', () => {
  const history = [{ date: '2026-10-03', sets: 1, reps: 5, weight: 25, rpe: 0,
    loggedSets: [{ setNumber: 1, reps: 5, weight: 25, completed: true }] }];
  const data = { settings: {}, bodyWeights: [], weeks: [{ id: 'w', name: 'Week', number: 1,
    days: [{ id: 'd', name: 'Day', completed: false, exercises: [{ id: 'e', name: 'Exercise',
      sets: 0, reps: 0, weight: 0, rpe: 0, notes: '', history }] }] }] };
  const schema = normalizeGymDataToRelational(data);
  const restored = denormalizeRelationalToWeeks(schema)[0].days[0].exercises[0];
  assert.equal(restored.rpe, 0);
  assert.equal(restored.sets, 0);
  assert.equal(restored.reps, 0);
  assert.equal(JSON.stringify(restored.history), JSON.stringify(history));
  restored.history[0].weight = 100;
  assert.equal(history[0].weight, 25);
  assert.equal(schema.exercises[0].history[0].weight, 25);
});

test('normalizeGymDataToRelational converts nested weeks into relational tables correctly', () => {
  const mockGymData = {
    settings: { unit: 'kg' },
    weeks: [
      {
        id: 'w1',
        number: 1,
        name: 'Tydzień 1',
        days: [
          {
            id: 'w1-d1',
            name: 'Push A',
            completed: true,
            exercises: [
              {
                id: 'ex-1',
                name: 'Wyciskanie leżąc',
                category: 'klatka',
                sets: 3,
                reps: 8,
                weight: 100,
                rpe: 8,
                notes: 'Pauza na klatce',
                history: [],
                loggedSets: [
                  { setNumber: 1, weight: 100, reps: 8, completed: true },
                  { setNumber: 2, weight: 100, reps: 8, completed: true }
                ]
              }
            ]
          }
        ]
      }
    ],
    bodyWeights: []
  };

  const normalized = normalizeGymDataToRelational(mockGymData);

  assert.equal(normalized.plans.length, 1);
  assert.equal(normalized.weeks.length, 1);
  assert.equal(normalized.weeks[0].id, 'w1');
  assert.equal(normalized.days.length, 1);
  assert.equal(normalized.days[0].id, 'w1-d1');
  assert.equal(normalized.exercises.length, 1);
  assert.equal(normalized.exercises[0].name, 'Wyciskanie leżąc');
  assert.equal(normalized.loggedSets.length, 2);
  assert.equal(normalized.loggedSets[0].weight, 100);

  // Round-trip test
  const restoredWeeks = denormalizeRelationalToWeeks(normalized);
  assert.equal(restoredWeeks.length, 1);
  assert.equal(restoredWeeks[0].days.length, 1);
  assert.equal(restoredWeeks[0].days[0].exercises.length, 1);
  assert.equal(restoredWeeks[0].days[0].exercises[0].name, 'Wyciskanie leżąc');
  assert.equal(restoredWeeks[0].days[0].exercises[0].loggedSets.length, 2);
  assert.equal(restoredWeeks[0].days[0].exercises[0].loggedSets[1].reps, 8);
});
