const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const file = path.join(__dirname, '..', 'src', 'utils', 'workoutSessionStorage.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const sessionModule = { exports: {} };
vm.runInNewContext(compiled, { module: sessionModule, exports: sessionModule.exports });
const { readWorkoutSession, shouldHoldWorkoutWakeLock, WORKOUT_SESSION_KEYS: keys } = sessionModule.exports;

const storageOf = (entries = {}) => ({ getItem: (key) => entries[key] ?? null });

test('a fresh install or timestamp-only legacy state is not an active workout', () => {
  assert.equal(readWorkoutSession(storageOf()).hasActiveSession, false);
  assert.deepEqual(
    { ...readWorkoutSession(storageOf({ [keys.start]: '1000' })) },
    { startTime: 0, hasActiveSession: false, isSessionActive: false, pausedAt: null, accumulatedPausedMs: 0 }
  );
});

test('explicit running state and a previously paused legacy workout recover safely', () => {
  const running = readWorkoutSession(storageOf({ [keys.start]: '1000', [keys.active]: 'true', [keys.paused]: 'false' }));
  assert.equal(running.hasActiveSession, true);
  assert.equal(running.isSessionActive, true);
  assert.equal(running.startTime, 1000);

  const pausedLegacy = readWorkoutSession(storageOf({ [keys.start]: '1000', [keys.paused]: 'true', [keys.pausedAt]: '2500' }));
  assert.equal(pausedLegacy.hasActiveSession, true);
  assert.equal(pausedLegacy.isSessionActive, false);
  assert.equal(pausedLegacy.pausedAt, 2500);
});

test('an explicitly ended session cannot be resurrected by stale timer data', () => {
  const ended = readWorkoutSession(storageOf({ [keys.start]: '1000', [keys.active]: 'false', [keys.paused]: 'false' }));
  assert.equal(ended.hasActiveSession, false);
  assert.equal(ended.isSessionActive, false);
  assert.equal(ended.startTime, 0);
});

test('WakeLock requires the opt-in, plan screen, active running session, visibility and API support', () => {
  assert.equal(shouldHoldWorkoutWakeLock(true, 'plan', true, true, true, true), true);
  for (const input of [
    [false, 'plan', true, true, true, true],
    [true, 'settings', true, true, true, true],
    [true, 'plan', false, true, true, true],
    [true, 'plan', true, false, true, true],
    [true, 'plan', true, true, false, true],
    [true, 'plan', true, true, true, false],
  ]) assert.equal(shouldHoldWorkoutWakeLock(...input), false);
});

test('wake lock is centralized, workout-scoped and released on view or visibility changes', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf8');
  const wakeLockPolicy = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'workoutSessionStorage.ts'), 'utf8');
  const turbo = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'TurboPowerSettingsPanel.tsx'), 'utf8');
  assert.match(app, /shouldHoldWorkoutWakeLock\(/);
  assert.match(wakeLockPolicy, /enabled && activeView === 'plan' && hasActiveSession && isSessionRunning && pageVisible && apiSupported/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /releaseWakeLock/);
  assert.doesNotMatch(turbo, /navigator\.wakeLock\.request/);
});
