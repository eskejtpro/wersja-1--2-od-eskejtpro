const test = require('node:test');
const assert = require('node:assert/strict');

// 1RM Formula implementations
function calcBrzycki(weight, reps) {
  if (reps === 1) return weight;
  return Math.round((weight / (1.0278 - 0.0278 * reps)) * 10) / 10;
}

function calcEpley(weight, reps) {
  if (reps === 1) return weight;
  return Math.round((weight * (1 + 0.0333 * reps)) * 10) / 10;
}

function calcLombardi(weight, reps) {
  if (reps === 1) return weight;
  return Math.round((weight * Math.pow(reps, 0.10)) * 10) / 10;
}

function calcWathan(weight, reps) {
  if (reps === 1) return weight;
  return Math.round(((100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps))) * 10) / 10;
}

// Plate Loading algorithm
function calcPlates(targetWeight, barWeight = 20) {
  const weightPerSide = Math.max(0, (targetWeight - barWeight) / 2);
  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
  const platesUsed = [];
  let remainder = weightPerSide;

  availablePlates.forEach(plate => {
    const count = Math.floor(remainder / plate);
    if (count > 0) {
      platesUsed.push({ weight: plate, count });
      remainder = Math.round((remainder - count * plate) * 100) / 100;
    }
  });

  return { weightPerSide, platesUsed, remainder };
}

// EMA Filter calculation
function calcEMA(previousEMA, currentReading, alpha = 0.3) {
  return Math.round((alpha * currentReading + (1 - alpha) * previousEMA) * 100) / 100;
}

// Pharmacokinetics Half-Life calculation
function calcResidualCompound(initialDose, daysElapsed, halfLifeDays) {
  return Math.round(initialDose * Math.pow(0.5, daysElapsed / halfLifeDays) * 10) / 10;
}

test('Poradnik: Wzory 1RM (Brzycki, Epley, Lombardi, Wathan) zwracają precyzyjne wartości', () => {
  // Test 1: Dla 1 powtórzenia wynik jest zawsze równy masie
  assert.equal(calcBrzycki(100, 1), 100);
  assert.equal(calcEpley(100, 1), 100);
  assert.equal(calcLombardi(100, 1), 100);
  assert.equal(calcWathan(100, 1), 100);

  // Test 2: Wyciskanie 100 kg na 8 powtórzeń
  const brzycki = calcBrzycki(100, 8);
  assert.ok(brzycki >= 124.0 && brzycki <= 124.5, `Brzycki 100x8 powinien być ~124.2 kg, otrzymano: ${brzycki}`);

  const epley = calcEpley(100, 8);
  assert.ok(epley >= 126.4 && epley <= 126.8, `Epley 100x8 powinien być ~126.6 kg, otrzymano: ${epley}`);

  const lombardi = calcLombardi(100, 8);
  assert.ok(lombardi >= 123.0 && lombardi <= 123.5, `Lombardi 100x8 powinien być ~123.1 kg, otrzymano: ${lombardi}`);

  const wathan = calcWathan(100, 8);
  assert.ok(wathan >= 127.5 && wathan <= 128.5, `Wathan 100x8 powinien być ~127.7 kg, otrzymano: ${wathan}`);
});

test('Poradnik: Algorytm doboru talerzy (Plate Calculator) optymalizuje załadunek gryfu', () => {
  // Przypadek 1: 100 kg na gryfie 20 kg -> 40 kg na stronę (1x 25kg + 1x 15kg)
  const res1 = calcPlates(100, 20);
  assert.equal(res1.weightPerSide, 40);
  assert.deepEqual(res1.platesUsed, [
    { weight: 25, count: 1 },
    { weight: 15, count: 1 }
  ]);
  assert.equal(res1.remainder, 0);

  // Przypadek 2: 142.5 kg na gryfie 20 kg -> 61.25 kg na stronę (2x 25kg, 1x 10kg, 1x 1.25kg)
  const res2 = calcPlates(142.5, 20);
  assert.equal(res2.weightPerSide, 61.25);
  assert.deepEqual(res2.platesUsed, [
    { weight: 25, count: 2 },
    { weight: 10, count: 1 },
    { weight: 1.25, count: 1 }
  ]);
  assert.equal(res2.remainder, 0);

  // Przypadek 3: Sam gryf (20 kg)
  const res3 = calcPlates(20, 20);
  assert.equal(res3.weightPerSide, 0);
  assert.deepEqual(res3.platesUsed, []);
});

test('Poradnik: Filtr EMA wagi ciała wygładza wahania wody i sodu', () => {
  const baseWeight = 85.0;
  const spikeWeight = 86.0;

  // Alfa standard = 0.3
  const emaStandard = calcEMA(baseWeight, spikeWeight, 0.3);
  assert.equal(emaStandard, 85.3);

  // Alfa wygładzona = 0.2
  const emaSmooth = calcEMA(baseWeight, spikeWeight, 0.2);
  assert.equal(emaSmooth, 85.2);

  // Alfa czuła = 0.5
  const emaSensitive = calcEMA(baseWeight, spikeWeight, 0.5);
  assert.equal(emaSensitive, 85.5);
});

test('Poradnik: Kalkulator farmakokinetyki i okresu półtrwania poprawnie modeluje eliminację', () => {
  // Dawka 250 mg po 5 dniach przy t1/2 = 5 dni -> 125.0 mg
  const res1 = calcResidualCompound(250, 5, 5);
  assert.equal(res1, 125.0);

  // Dawka 250 mg po 10 dniach (2 okresy półtrwania) -> 62.5 mg
  const res2 = calcResidualCompound(250, 10, 5);
  assert.equal(res2, 62.5);
});

test('Poradnik: Struktura rozdziałów wiedzy zawiera kompletne opisy, wzory i FAQ', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const guideFilePath = path.join(__dirname, '..', 'src', 'components', 'AppKnowledgeGuide.tsx');

  assert.ok(fs.existsSync(guideFilePath), 'Plik AppKnowledgeGuide.tsx musi istnieć');
  const content = fs.readFileSync(guideFilePath, 'utf8');

  // Weryfikacja obecności kluczowych sekcji w przewodniku
  assert.ok(content.includes('GUIDE_CHAPTERS'), 'Musi eksportować listę GUIDE_CHAPTERS');
  assert.ok(content.includes('Brzycki'), 'Musi zawierać wzór Brzyckiego');
  assert.ok(content.includes('Epley'), 'Musi zawierać wzór Epleya');
  assert.ok(content.includes('EMA_t = α · Waga_t'), 'Musi zawierać wzór EMA');
  assert.ok(content.includes('Room Database'), 'Musi opisywać architekturę Room');
  assert.ok(content.includes('Xiaomi 14T'), 'Musi zawierać opis optymalizacji Xiaomi 14T i AMOLED');
  assert.ok(content.includes('Piaskownica Matematyczna'), 'Musi posiadać interaktywną piaskownicę wzorów');
});
