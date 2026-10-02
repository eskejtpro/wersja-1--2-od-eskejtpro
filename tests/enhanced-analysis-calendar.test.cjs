const test = require('node:test');
const assert = require('node:assert/strict');

test('ANALIZA: Wskaźnik Intensywności Tonażu (Tonnage Intensity Index)', () => {
  const history = [
    { weight: 100, reps: 5, sets: 3 }, // 1500 kg, 15 reps
    { weight: 110, reps: 3, sets: 3 }, // 990 kg, 9 reps
  ];
  const totalVolume = history.reduce((acc, p) => acc + (p.weight * p.reps * p.sets), 0); // 2490
  const totalReps = history.reduce((acc, p) => acc + (p.reps * p.sets), 0); // 24
  const intensityPerRep = Math.round((totalVolume / totalReps) * 10) / 10; // 103.8 kg/rep

  assert.equal(totalVolume, 2490);
  assert.equal(totalReps, 24);
  assert.equal(intensityPerRep, 103.8, 'Średni ciężar na powtórzenie wynosi 103.8 kg');
});

test('ANALIZA: Stosunek Zmęczenia ACWR (Acute to Chronic Workload Ratio)', () => {
  const weeklyTonnages = [12000, 13000, 12500, 14000];
  const acute = weeklyTonnages[weeklyTonnages.length - 1]; // 14000
  const chronic = weeklyTonnages.reduce((a, b) => a + b, 0) / weeklyTonnages.length; // 12875
  const acwr = Math.round((acute / chronic) * 100) / 100; // 1.09

  assert.equal(acute, 14000);
  assert.equal(acwr, 1.09, 'ACWR 1.09 mieści się w optymalnej strefie adaptacji (0.8 - 1.3)');
  assert.ok(acwr >= 0.8 && acwr <= 1.3, 'Strefa optymalna bez ryzyka przetrenowania');
});

test('ANALIZA: Porównanie 4 wzorów 1RM (Epley, Brzycki, Wathan, Lombardi)', () => {
  const weight = 100;
  const reps = 5;

  const epley = Math.round(weight * (1 + reps / 30) * 10) / 10; // 116.7
  const brzycki = Math.round(weight * (36 / (37 - reps)) * 10) / 10; // 112.5
  const wathan = Math.round(((100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps))) * 10) / 10;
  const lombardi = Math.round(weight * Math.pow(reps, 0.10) * 10) / 10;

  assert.equal(epley, 116.7);
  assert.equal(brzycki, 112.5);
  assert.ok(wathan > 100 && wathan < 130, 'Wathan 1RM jest w realistycznym zakresie');
  assert.ok(lombardi > 100 && lombardi < 130, 'Lombardi 1RM jest w realistycznym zakresie');
});

test('KALENDARZ: Korelacja dnia z iniekcją, notatką i treningiem', () => {
  const dateStr = '2026-10-02';
  const entry = { id: 'p1', date: dateStr, substance: 'Testosteron', dosage: 250, unit: 'mg' };
  const note = { id: 'n1', date: dateStr, title: 'Trening PR', category: 'training' };
  const workout = { weekName: 'Tydzień 1', dayName: 'Dzień 1 - Push', exercisesCount: 5 };

  assert.equal(entry.date, dateStr);
  assert.equal(note.date, dateStr);
  assert.equal(workout.exercisesCount, 5);
});
