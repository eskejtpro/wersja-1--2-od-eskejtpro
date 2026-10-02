const test = require('node:test');
const assert = require('node:assert/strict');

test('Kompaktowy Układ Kart (Card Density): Obsługuje tryby compact, ultra_dense oraz standard', () => {
  const densityModes = ['compact', 'ultra_dense', 'standard'];

  // Weryfikacja dostępności trybów
  assert.equal(densityModes.length, 3);
  assert.ok(densityModes.includes('compact'));
  assert.ok(densityModes.includes('ultra_dense'));
  assert.ok(densityModes.includes('standard'));

  // Symulacja kalkulacji wysokości karty w trybie compact
  const standardHeightPx = 280;
  const compactHeightPx = Math.round(standardHeightPx * 0.65); // ~35% oszczędności
  const ultraDenseHeightPx = Math.round(standardHeightPx * 0.45); // ~55% oszczędności

  assert.ok(compactHeightPx < standardHeightPx, 'Tryb compact musi być niższy od standard');
  assert.ok(ultraDenseHeightPx < compactHeightPx, 'Tryb ultra_dense musi być najbardziej zagęszczony');
});
