const test = require('node:test');
const assert = require('node:assert/strict');

const memoryStorage = new Map();
global.localStorage = {
  getItem: (key) => memoryStorage.has(key) ? memoryStorage.get(key) : null,
  setItem: (key, value) => memoryStorage.set(key, String(value)),
  removeItem: (key) => memoryStorage.delete(key),
};

test('historia nawodnienia zachowuje stare dane i umożliwia wpisy dla różnych dni', async () => {
  memoryStorage.clear();
  localStorage.setItem('gymtracker_water_today', '1250');
  const service = await import('../src/utils/hydrationService.ts');
  const today = service.getTodayDateKey();
  let history = service.loadHydrationHistory();
  assert.equal(service.getHydrationDay(history, today).totalMl, 1250);

  history = service.logWaterIntake(history, '2026-10-08', 250);
  history = service.logWaterIntake(history, '2026-10-08', 500);
  const yesterday = service.getHydrationDay(history, '2026-10-08');
  assert.equal(yesterday.totalMl, 750);
  assert.equal(yesterday.entries.length, 2);

  history = service.removeWaterEntry(history, '2026-10-08', yesterday.entries[0].id);
  assert.equal(service.getHydrationDay(history, '2026-10-08').totalMl, 500);
  assert.equal(service.getHydrationDay(history, today).totalMl, 1250);
});

test('historia nawodnienia wylicza podsumowanie siedmiu dni bez zmiany zapisów', async () => {
  const service = await import('../src/utils/hydrationService.ts');
  const source = {
    '2026-10-01': { date: '2026-10-01', totalMl: 3000, targetMl: 3000, entries: [] },
    '2026-10-02': { date: '2026-10-02', totalMl: 1500, targetMl: 3000, entries: [] },
  };
  const summary = service.getRecentHydrationStats(source, 2, '2026-10-02');
  assert.equal(summary.averageMl, 2250);
  assert.equal(summary.daysMetGoalCount, 1);
  assert.equal(source['2026-10-01'].totalMl, 3000);
});
