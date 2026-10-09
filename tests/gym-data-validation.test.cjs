const test = require('node:test');
const assert = require('node:assert/strict');
const tsx = require('tsx/cjs/api');

const loaded = tsx.require('../src/utils/gymDataValidation.ts', __filename);
const initial = tsx.require('../src/data/initialData.ts', __filename);
const { isGymData } = loaded;

const valid = {
  settings: { unit: 'kg', theme: 'dark', autoSave: true },
  weeks: [{ id: 'week-1', number: 1, name: 'Week 1', days: [{
    id: 'day-1', name: 'Day 1', completed: false, exercises: [{
      id: 'exercise-1', name: 'Squat', sets: 3, reps: 5, weight: 60, rpe: 7, notes: '', history: [],
    }],
  }] }],
  bodyWeights: [],
};

test('accepts valid current and legacy GymData cores', () => {
  assert.equal(isGymData(initial.initialGymData), true);
  assert.equal(isGymData(valid), true);
  const legacy = structuredClone(valid);
  delete legacy.circumferences;
  delete legacy.bodyPartMeasurements;
  assert.equal(isGymData(legacy), true);
});

test('rejects malformed nested exercises before import', () => {
  const malformed = structuredClone(valid);
  malformed.weeks[0].days[0].exercises[0].history = [{ date: 'today', weight: 'heavy' }];
  assert.equal(isGymData(malformed), false);
});

test('rejects missing required settings and malformed measurements', () => {
  assert.equal(isGymData({ ...valid, settings: {} }), false);
  assert.equal(isGymData({ ...valid, bodyWeights: [{ id: 'x', date: 'today', weight: NaN, notes: '' }] }), false);
});

test('rejects a partially corrupt week without mutating the source', () => {
  const malformed = structuredClone(valid);
  malformed.weeks[0].days = 'not-an-array';
  const snapshot = structuredClone(malformed);
  assert.equal(isGymData(malformed), false);
  assert.deepEqual(malformed, snapshot);
});
