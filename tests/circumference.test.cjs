const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTypeScriptModule(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }),
    { module, exports: module.exports }
  );
  return module.exports;
}

const {
  parseCircumferenceMillimeters,
  sortCircumferences,
  sameCircumferenceSeries,
  calculateCircumferenceChange,
  circumferenceEntriesOrEmpty,
  analyzeCircumferenceTrend,
  calculateEma,
  pearsonCorrelation,
  regressionSlopePerWeek,
  ANALYSIS_THRESHOLDS,
  interpretCircumferenceAndStrength
} = loadTypeScriptModule('src/utils/circumference.ts');

const entry = (id, date, millimeters, side = 'left', variant = 'standard') => ({
  id, date, bodyPart: 'udo', side, variant, millimeters, notes: ''
});

test('stores decimal-comma centimeters as positive integer millimeters', () => {
  assert.equal(parseCircumferenceMillimeters('35,7'), 357);
  assert.equal(parseCircumferenceMillimeters('35.7'), 357);
  assert.equal(parseCircumferenceMillimeters('35'), 350);
  assert.equal(parseCircumferenceMillimeters('0'), null);
  assert.equal(parseCircumferenceMillimeters('-35,7'), null);
  assert.equal(parseCircumferenceMillimeters('35,77'), null);
  assert.equal(parseCircumferenceMillimeters('35cm'), null);
});

test('compares 350 mm to 357 mm with the specified deltas', () => {
  const change = calculateCircumferenceChange(357, 350);
  assert.equal(change.millimeters, 7);
  assert.equal(change.centimeters, 0.7);
  assert.equal(change.percent, 2);
});

test('sorts dates and keeps left and right measurements separate', () => {
  const leftEarly = entry('l-early', '2026-09-01', 350);
  const rightLater = entry('r-later', '2026-09-10', 360, 'right');
  const leftLater = entry('l-later', '2026-09-15', 357);
  const sorted = sortCircumferences([leftLater, rightLater, leftEarly]);
  assert.deepEqual(Array.from(sorted, (item) => item.id), ['l-early', 'r-later', 'l-later']);
  assert.equal(sameCircumferenceSeries(leftLater, leftEarly), true);
  assert.equal(sameCircumferenceSeries(leftLater, rightLater), false);
});

test('treats missing circumference data in an old JSON document as an empty list', () => {
  assert.equal(circumferenceEntriesOrEmpty(undefined).length, 0);
});

test('keeps an outlier in raw data but excludes it from the trend after the previous-three median check', () => {
  const series = [
    entry('a', '2026-09-01', 350), entry('b', '2026-09-08', 351), entry('c', '2026-09-15', 350), entry('d', '2026-09-22', 450)
  ];
  const analysis = analyzeCircumferenceTrend(series);
  assert.equal(analysis.raw.length, 4);
  assert.equal(analysis.raw[3].uncertain, true);
  assert.equal(analysis.trendPoints.length, 3);
});

test('requires three valid dates for regression and handles a constant series without Z-Score', () => {
  assert.equal(analyzeCircumferenceTrend([entry('a', '2026-09-01', 350), entry('b', '2026-09-08', 357)]).slopePerWeek, null);
  const constant = analyzeCircumferenceTrend([entry('a', '2026-09-01', 350), entry('b', '2026-09-08', 350), entry('c', '2026-09-15', 350)]);
  assert.equal(constant.isConstant, true);
  assert.equal(constant.standardDeviation, 0);
  assert.equal(constant.raw.every((point) => point.zScore === null), true);
});

test('uses actual dates, preserves same-day raw measurements, and calculates EMA with alpha 0.3', () => {
  const analysis = analyzeCircumferenceTrend([
    entry('a', '2026-09-01', 350), entry('b', '2026-09-01', 351), entry('c', '2026-09-08', 357), entry('d', '2026-09-15', 364)
  ]);
  assert.equal(analysis.raw.length, 4);
  assert.equal(analysis.trendPoints.length, 3);
  assert.equal(calculateEma([350, 357])[1], 352.1);
  assert.equal(ANALYSIS_THRESHOLDS.circumferenceMillimetersPerWeek, 1);
  assert.equal(ANALYSIS_THRESHOLDS.strengthKilogramsPerWeek, 0.5);
});

test('calculates Pearson r only from at least five paired values and returns cautious status text', () => {
  assert.equal(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8]), null);
  assert.equal(pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]), 1);
  assert.equal(interpretCircumferenceAndStrength(2, 1), 'zgodny wzrost obwodu i siły');
  assert.match(interpretCircumferenceAndStrength(2, 0), /możliwa retencja/);
});

test('calculates strength slope from real day spacing rather than point index', () => {
  assert.equal(regressionSlopePerWeek([
    { date: '2026-09-01', value: 100 }, { date: '2026-09-08', value: 100.5 }, { date: '2026-09-15', value: 101 }
  ]), 0.5);
});
