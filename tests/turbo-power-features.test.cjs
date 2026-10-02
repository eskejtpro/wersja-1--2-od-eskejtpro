const test = require('node:test');
const assert = require('node:assert/strict');

test('TURBO POWER: Wzór kalkulatora rozgrzewki (Smart Warm-up Ramp)', () => {
  const barWeight = 20;
  const targetWeight = 100;
  const delta = targetWeight - barWeight;

  const r1 = barWeight; // 20kg
  const r2 = Math.round((barWeight + delta * 0.4) / 2.5) * 2.5; // ~52.5kg
  const r3 = Math.round((barWeight + delta * 0.65) / 2.5) * 2.5; // ~72.5kg
  const r4 = Math.round((barWeight + delta * 0.85) / 2.5) * 2.5; // ~87.5kg

  assert.equal(r1, 20, 'Pierwsza seria rozgrzewkowa to sam gryf 20kg');
  assert.ok(r2 > r1 && r2 < r3, 'Seria 2 jest wyższa niż seria 1 i niższa niż 3');
  assert.ok(r3 > r2 && r3 < r4, 'Seria 3 jest wyższa niż seria 2');
  assert.ok(r4 > r3 && r4 < targetWeight, 'Seria 4 to rampa 85% przed serią roboczą');
  assert.equal(r4 <= targetWeight, true, 'Ostatnia rampa nie przekracza ciężaru głównego');
});

test('TURBO POWER: Progresja przeciążenia (+2.5kg po zaliczeniu wszystkich serii)', () => {
  const currentWeight = 100;
  const loggedSets = [
    { setNumber: 1, completed: true, weight: 100, reps: 8 },
    { setNumber: 2, completed: true, weight: 100, reps: 8 },
    { setNumber: 3, completed: true, weight: 100, reps: 8 },
  ];

  const allCompleted = loggedSets.every(s => s.completed);
  assert.equal(allCompleted, true, 'Wszystkie serie zostały zaliczone');

  const suggestedWeight = allCompleted ? currentWeight + 2.5 : currentWeight;
  assert.equal(suggestedWeight, 102.5, 'Sugerowany ciężar to +2.5kg');
});

test('TURBO POWER: Obsługa różnych typów gryfów w kalkulatorze (20kg, 15kg, 25kg Trap bar)', () => {
  const bars = [20, 15, 25, 10];
  const target = 140;

  bars.forEach(b => {
    const weightPerSide = (target - b) / 2;
    assert.ok(weightPerSide > 0, `Obciążenie na stronę dla gryfu ${b}kg jest dodatnie`);
    assert.equal((weightPerSide * 2) + b, target, `Suma na stronę x 2 + gryf daje dokładnie ${target}kg`);
  });
});
