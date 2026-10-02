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

test('Workout timer wall-clock calculation survives window switches and background pauses', () => {
  mockLocalStorage.clear();

  // 1. Symulacja startu treningu o godzinie T0
  const t0 = 1000000000000;
  mockLocalStorage.setItem('planpasika_session_start_v1', String(t0));
  mockLocalStorage.setItem('planpasika_session_paused_v1', 'false');
  mockLocalStorage.setItem('planpasika_session_accumulated_paused_v1', '0');

  // Funkcja wyliczająca czas sesji z wall-clock
  function calculateElapsed(currentTimeMs) {
    const start = Number(mockLocalStorage.getItem('planpasika_session_start_v1'));
    const isPaused = mockLocalStorage.getItem('planpasika_session_paused_v1') === 'true';
    const pausedAt = mockLocalStorage.getItem('planpasika_session_paused_at_v1')
      ? Number(mockLocalStorage.getItem('planpasika_session_paused_at_v1'))
      : null;
    const accumulated = Number(mockLocalStorage.getItem('planpasika_session_accumulated_paused_v1') || 0);

    if (isPaused && pausedAt) {
      return Math.max(0, Math.floor((pausedAt - start - accumulated) / 1000));
    }
    return Math.max(0, Math.floor((currentTimeMs - start - accumulated) / 1000));
  }

  // 10 sekund później
  assert.equal(calculateElapsed(t0 + 10000), 10);

  // Użytkownik przełącza się na inne okno (np. Spotify / Waga) na 3 minuty (180s)
  // i wraca o t0 + 190s
  assert.equal(calculateElapsed(t0 + 190000), 190);

  // 2. Symulacja Rest Timera na 90 sekund
  // Uruchomienie o t0 + 190s -> koniec o t0 + 280s
  const restTarget = t0 + 280000;
  mockLocalStorage.setItem('planpasika_rest_target_v1', String(restTarget));

  function calculateRemainingRest(currentTimeMs) {
    const target = Number(mockLocalStorage.getItem('planpasika_rest_target_v1'));
    if (!target) return null;
    const remainingMs = target - currentTimeMs;
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }

  // Użytkownik w trakcie przerwy (np. po 40 sekundach od startu przerwy)
  assert.equal(calculateRemainingRest(t0 + 230000), 50);

  // Użytkownik wraca po minięciu 90 sekund (np. o t0 + 285s)
  assert.equal(calculateRemainingRest(t0 + 285000), 0);

  // 3. Sprawdzenie pauzy: zatrzymanie o t0 + 300s
  const pauseTime = t0 + 300000;
  mockLocalStorage.setItem('planpasika_session_paused_v1', 'true');
  mockLocalStorage.setItem('planpasika_session_paused_at_v1', String(pauseTime));

  // Nawet gdy mija kolejne 10 minut w innym oknie, czas pozostaje zamrożony na 300s
  assert.equal(calculateElapsed(pauseTime + 600000), 300);
});
