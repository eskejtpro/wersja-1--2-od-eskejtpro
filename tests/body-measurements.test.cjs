const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { Store, validate } = require('../desktop/storage.cjs');

const fixture = () => ({
  settings: {
    unit: 'kg',
    theme: 'dark',
    autoSave: true,
    athleteName: 'Test',
    windowsPath: '',
    soundFeedback: false,
    maxBackupFiles: 2
  },
  weeks: [],
  bodyWeights: [],
  bodyPartMeasurements: []
});

const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'measurements-test-'));

test('accepts valid bodyPartMeasurements for biceps, triceps, klata, barki, nogi and survives restart', () => {
  const d = dir();
  const f = fixture();
  f.bodyPartMeasurements = [
    { id: 'bpm-1', date: '2026-08-15', part: 'biceps', value: 37.5, notes: 'Start' },
    { id: 'bpm-2', date: '2026-08-29', part: 'triceps', value: 35.5, notes: 'Triceps' },
    { id: 'bpm-3', date: '2026-09-01', part: 'klata', value: 107.0, notes: 'Klata' },
    { id: 'bpm-4', date: '2026-09-05', part: 'barki', value: 122.0, notes: 'Barki' },
    { id: 'bpm-5', date: '2026-09-12', part: 'nogi', value: 61.5, notes: 'Nogi' }
  ];
  const s = new Store(d);
  s.save(f);
  const loaded = new Store(d).load();
  assert.deepEqual(loaded.bodyPartMeasurements, f.bodyPartMeasurements);
});

test('rejects invalid bodyPart name and negative/zero measurement values', () => {
  const s = new Store(dir());
  s.save(fixture());

  const badPart = fixture();
  badPart.bodyPartMeasurements = [
    { id: 'bpm-bad', date: '2026-09-01', part: 'invalid_part', value: 38.0 }
  ];
  assert.throws(() => s.save(badPart));

  const badVal = fixture();
  badVal.bodyPartMeasurements = [
    { id: 'bpm-bad2', date: '2026-09-01', part: 'biceps', value: -5 }
  ];
  assert.throws(() => s.save(badVal));
});
